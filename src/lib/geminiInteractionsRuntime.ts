import { GoogleGenAI } from '@google/genai';
import { runWithModelResilience, buildModelResiliencePolicy, type ModelResiliencePolicy, type ModelResilienceStateStore } from './modelResilience';
import type { ReliabilitySettings } from './reliabilitySettings';
import { emitResilienceDiagnostic } from './resilienceDiagnostics';
import type { GeminiRequestUsageTelemetry } from './geminiRequestTelemetry';

export interface InteractionRuntimeOptions {
  ai: GoogleGenAI;
  preferredModel: string;
  buildConfig: (model: string) => any;
  contents: any[];
  onChunk: (chunk: { text?: string; thoughtText?: string; thoughtType?: 'summary'; finishReason?: string; safetyRatings?: any; functionCall?: any }) => void;
  signal?: AbortSignal;
  policy?: ModelResiliencePolicy;
  reliabilitySettings?: ReliabilitySettings;
  stateStore?: ModelResilienceStateStore;
  conversationId?: string;
  requestId?: string;
}

export interface InteractionRuntimeResult {
  model: string;
  usedFallback: boolean;
  probingPreferred: boolean;
  attempts: number;
  functionCalls: Array<{ name: string; args: Record<string, unknown>; id: string }>;
  modelParts: any[];
  interactionId?: string;
  usage?: GeminiRequestUsageTelemetry;
}

interface InteractionState {
  previousInteractionId?: string;
  interactionIds: Set<string>;
  processedContentCount: number;
  history: any[];
}

const stateByContents = new WeakMap<object, InteractionState>();

function safeTextPart(part: any): any | null {
  if (typeof part?.text === 'string' && part.text.length > 0) return { type: 'text', text: part.text };
  if (part?.inlineData?.data && part?.inlineData?.mimeType) {
    return { type: 'image', data: String(part.inlineData.data), mime_type: String(part.inlineData.mimeType) };
  }
  return null;
}

function buildInitialInteractionHistory(contents: any[]): any[] {
  const history: any[] = [];
  for (const content of contents || []) {
    const parts = Array.isArray(content?.parts) ? content.parts : [];
    if (content?.role === 'user' || content?.role === 'tool') {
      const functionResponses = parts.filter((part: any) => part?.functionResponse);
      if (functionResponses.length > 0) {
        for (const part of functionResponses) {
          const fr = part.functionResponse;
          history.push({ type: 'function_result', name: String(fr.name || ''), call_id: String(fr.id || ''), result: fr.response ?? {} });
        }
        continue;
      }
      const userContent = parts.map(safeTextPart).filter(Boolean);
      if (userContent.length > 0) history.push({ type: 'user_input', content: userContent });
      continue;
    }

    if (content?.role === 'model') {
      const modelText = parts.map(safeTextPart).filter(Boolean);
      if (modelText.length > 0) history.push({ type: 'model_output', content: modelText });
      for (const part of parts.filter((item: any) => item?.functionCall)) {
        const call = part.functionCall;
        history.push({ type: 'function_call', id: String(call.id || ''), name: String(call.name || ''), arguments: call.args ?? call.arguments ?? {} });
      }
    }
  }
  return history.length > 0 ? history : [{ type: 'user_input', content: [{ type: 'text', text: '' }] }];
}

function getState(contents: any[]): InteractionState {
  const existing = stateByContents.get(contents);
  if (existing) return existing;
  const state: InteractionState = { previousInteractionId: undefined, interactionIds: new Set<string>(), processedContentCount: contents.length, history: buildInitialInteractionHistory(contents) };
  stateByContents.set(contents, state);
  return state;
}

function appendNewFunctionResults(contents: any[], state: InteractionState): any[] {
  const results: any[] = [];
  for (const content of contents.slice(state.processedContentCount)) {
    for (const part of Array.isArray(content?.parts) ? content.parts : []) {
      if (!part?.functionResponse) continue;
      const fr = part.functionResponse;
      results.push({ type: 'function_result', name: String(fr.name || ''), call_id: String(fr.id || ''), result: fr.response ?? {} });
    }
  }
  state.processedContentCount = contents.length;
  return results;
}

function toInteractionTools(config: any): any[] {
  const declarations = Array.isArray(config?.tools) ? config.tools.flatMap((tool: any) => Array.isArray(tool?.functionDeclarations) ? tool.functionDeclarations : []) : [];
  return declarations.filter((declaration: any) => declaration?.name).map((declaration: any) => ({
    type: 'function',
    name: String(declaration.name),
    description: typeof declaration.description === 'string' ? declaration.description : undefined,
    parameters: declaration.parametersJsonSchema ?? declaration.parameters,
  }));
}

function normalizeInteractionSafetySettings(settings: any): any[] | undefined {
  if (!Array.isArray(settings)) return undefined;
  return settings.map((setting) => {
    const rawType = String(setting?.type ?? setting?.category ?? '').trim();
    const rawThreshold = String(setting?.threshold ?? '').trim();
    const type = rawType.replace(/^HARM_CATEGORY_/i, '').toLowerCase();
    const threshold = rawThreshold.replace(/^HARM_BLOCK_THRESHOLD_/i, '').replace(/^BLOCK_/i, 'block_').toLowerCase();
    return {
      ...(type ? { type } : {}),
      ...(threshold ? { threshold } : {}),
    };
  }).filter((setting) => setting.type && setting.threshold);
}

function toInteractionRequest(model: string, config: any, input: any, previousInteractionId?: string): any {
  const request: any = { model, input, stream: true, store: true };
  if (previousInteractionId) request.previous_interaction_id = previousInteractionId;
  if (typeof config?.systemInstruction === 'string' && config.systemInstruction) request.system_instruction = config.systemInstruction;

  // Interactions has its own generation_config schema. Custom safety_settings
  // are not supported on the Interactions API, so GenerateContent safety policy
  // is deliberately not serialized into this stateful request.
  const generationConfig: any = {};
  if (typeof config?.maxOutputTokens === 'number') generationConfig.max_output_tokens = config.maxOutputTokens;
  if (typeof config?.temperature === 'number') generationConfig.temperature = config.temperature;
  if (typeof config?.topP === 'number') generationConfig.top_p = config.topP;
  if (typeof config?.topK === 'number') generationConfig.top_k = config.topK;
  if (config?.thinkingConfig && typeof config.thinkingConfig === 'object') {
    if (typeof config.thinkingConfig.thinkingLevel === 'string') generationConfig.thinking_level = config.thinkingConfig.thinkingLevel;
    if (typeof config.thinkingConfig.thinkingBudget === 'number') generationConfig.thinking_budget = config.thinkingConfig.thinkingBudget;
  }
  if (Object.keys(generationConfig).length > 0) request.generation_config = generationConfig;

  const tools = toInteractionTools(config);
  if (tools.length > 0) request.tools = tools;
  return request;
}

function getUsageTelemetry(usage: any): GeminiRequestUsageTelemetry | undefined {
  if (!usage) return undefined;
  return {
    inputTokenCount: usage.total_input_tokens,
    outputTokenCount: usage.total_output_tokens,
    thoughtsTokenCount: usage.total_thought_tokens,
    toolUsePromptTokenCount: usage.total_tool_use_tokens,
    cachedContentTokenCount: usage.total_cached_tokens,
    totalTokenCount: usage.total_tokens,
  };
}

function extractFunctionCalls(steps: any[]): Array<{ name: string; args: Record<string, unknown>; id: string }> {
  return (steps || []).filter((step: any) => step?.type === 'function_call').map((step: any) => ({
    name: String(step.name || ''),
    args: step.arguments && typeof step.arguments === 'object' && !Array.isArray(step.arguments) ? step.arguments : {},
    id: String(step.id || ''),
  })).filter((call) => call.name && call.id);
}

async function cleanupInteractions(ai: GoogleGenAI, state: InteractionState): Promise<void> {
  const ids = [...state.interactionIds];
  state.previousInteractionId = undefined;
  state.interactionIds.clear();
  await Promise.all(ids.map(async (id) => { try { await ai.interactions.delete(id); } catch { /* best effort */ } }));
}

function providerError(event: any, model: string): never {
  const provider = event?.error || {};
  const message = String(provider.message || 'Gemini Interactions API returned an error event.');
  const error = new Error(message);
  (error as any).apiError = { code: provider.code ? String(provider.code).toUpperCase() : 'UNKNOWN_API_ERROR', httpStatus: typeof provider.status === 'number' ? provider.status : undefined, modelId: model, message, retryable: false, rawMessage: message };
  throw error;
}

export async function runResilientGeminiInteractionTurn(options: InteractionRuntimeOptions): Promise<InteractionRuntimeResult> {
  const policy = options.policy || (options.reliabilitySettings ? buildModelResiliencePolicy(options.reliabilitySettings) : undefined);
  const state = getState(options.contents);
  const requestId = options.requestId || policy?.requestId;

  try {
    const result = await runWithModelResilience(options.preferredModel, async (model) => {
      const config = options.buildConfig(model);
      const newResults = appendNewFunctionResults(options.contents, state);
      const input = state.previousInteractionId ? newResults : state.history;
      const request = toInteractionRequest(model, config, input, state.previousInteractionId);
      emitResilienceDiagnostic({ kind: 'METRIC', provider: 'google', conversationId: options.conversationId, requestId, preferredModel: options.preferredModel, actualModel: model, phase: state.previousInteractionId ? 'continuation' : 'generation', contentsCount: options.contents.length, totalPartCount: options.contents.reduce((n: number, c: any) => n + (Array.isArray(c?.parts) ? c.parts.length : 0), 0), modelPartCount: 0, functionCallCount: 0, functionResponseCount: newResults.length, functionCallIdsPresent: 0, thoughtSignaturesPresent: 0, toolDeclarationCount: Array.isArray(request.tools) ? request.tools.length : 0, message: `Gemini Interactions request prepared with ${Array.isArray(input) ? input.length : 1} input steps.` });

      let interactionId: string | undefined;
      let status = 'in_progress';
      let usage: GeminiRequestUsageTelemetry | undefined;
      const streamedCalls = new Map<string, { id: string; name: string; args: string }>();
      let completedSteps: any[] = [];

      const stream = await options.ai.interactions.create(request) as any;
      for await (const event of stream) {
        if (options.signal?.aborted) throw options.signal.reason || new DOMException('Aborted', 'AbortError');
        switch (event?.event_type) {
          case 'interaction.created': interactionId = String(event?.interaction?.id || ''); if (interactionId) state.interactionIds.add(interactionId); break;
          case 'step.start': {
            const step = event?.step;
            if (step?.type === 'function_call') streamedCalls.set(String(step.id || event.index), { id: String(step.id || ''), name: String(step.name || ''), args: typeof step.arguments === 'string' ? step.arguments : '' });
            break;
          }
          case 'step.delta': {
            const delta = event?.delta;
            if (delta?.type === 'text' && typeof delta.text === 'string') options.onChunk({ text: delta.text });
            else if (delta?.type === 'thought_summary') { const text = delta?.content?.text; if (typeof text === 'string') options.onChunk({ thoughtText: text, thoughtType: 'summary' }); }
            else if (delta?.type === 'arguments_delta') { const key = String(event.index); const current = streamedCalls.get(key) || [...streamedCalls.values()][0]; if (current) current.args += String(delta.arguments || ''); }
            break;
          }
          case 'interaction.requires_action': status = 'requires_action'; break;
          case 'interaction.completed': interactionId = interactionId || String(event?.interaction?.id || ''); if (interactionId) state.interactionIds.add(interactionId); status = String(event?.interaction?.status || 'completed'); usage = getUsageTelemetry(event?.interaction?.usage); completedSteps = Array.isArray(event?.interaction?.steps) ? event.interaction.steps : []; break;
          case 'interaction.in_progress': case 'interaction.status_update': status = String(event?.status || event?.interaction?.status || status); break;
          case 'error': providerError(event, model); break;
          default: break;
        }
      }

      let functionCalls = extractFunctionCalls(completedSteps);
      if (functionCalls.length === 0 && status === 'requires_action' && streamedCalls.size > 0) {
        functionCalls = [...streamedCalls.values()].map((call) => {
          let args: Record<string, unknown> = {};
          if (call.args.trim()) { const parsed = JSON.parse(call.args); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) args = parsed; }
          return { name: call.name, args, id: call.id };
        }).filter((call) => call.name && call.id);
      }

      state.previousInteractionId = functionCalls.length > 0 ? interactionId : undefined;
      if (functionCalls.length === 0) await cleanupInteractions(options.ai, state);

      emitResilienceDiagnostic({ kind: 'SUCCESS', outcome: 'success', provider: 'google', conversationId: options.conversationId, requestId, preferredModel: options.preferredModel, actualModel: model, phase: functionCalls.length > 0 ? 'continuation' : 'stream', functionCallCount: functionCalls.length, functionCallIdsPresent: functionCalls.length, observedInputTokens: usage?.inputTokenCount, observedOutputTokens: usage?.outputTokenCount, observedThoughtsTokens: usage?.thoughtsTokenCount, observedToolUsePromptTokens: usage?.toolUsePromptTokenCount, observedCachedContentTokens: usage?.cachedContentTokenCount, observedTotalTokens: usage?.totalTokenCount, message: `Gemini Interactions turn completed with status ${status}.` });

      return { value: { functionCalls, modelParts: functionCalls.map((call) => ({ functionCall: { name: call.name, args: call.args, id: call.id } })), interactionId, usage }, emittedOutput: true };
    }, { ...policy, conversationId: options.conversationId ?? policy?.conversationId, requestId }, options.stateStore);

    return { model: result.context.model, usedFallback: result.context.usedFallback, probingPreferred: result.context.probingPreferred, attempts: result.context.attempts, ...result.value };
  } catch (error) {
    await cleanupInteractions(options.ai, state);
    throw error;
  }
}
