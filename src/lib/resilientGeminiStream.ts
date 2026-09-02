import { runWithModelResilience, buildModelResiliencePolicy, type ModelResiliencePolicy, type ModelResilienceStateStore } from './modelResilience';
import type { InteractionRuntimeOptions, InteractionRuntimeResult } from './geminiInteractionsRuntime';
import { isGemini3Model } from './modelRegistry';

export type { InteractionRuntimeOptions, InteractionRuntimeResult } from './geminiInteractionsRuntime';
export interface ResilientStreamTurnResult extends InteractionRuntimeResult {}
export interface ResilientStreamTurnOptions extends InteractionRuntimeOptions {}

type GenerateContentTurnValue = {
  functionCalls: Array<{ name: string; args: Record<string, unknown>; id: string }>;
  modelParts: any[];
  interactionId?: string;
  usage?: any;
};

function safetyError(model: string, details: Record<string, unknown>): Error {
  const providerDetail = JSON.stringify(details);
  const error = new Error(`Gemini content safety blocked this request: ${providerDetail}`);
  (error as any).apiError = {
    code: 'CONTENT_SAFETY_400',
    httpStatus: 400,
    modelId: model,
    message: error.message,
    retryable: false,
    rawMessage: error.message,
    safetyDetails: details,
  };
  return error;
}

function invalidRequestError(model: string, message: string): Error {
  const error = new Error(message);
  (error as any).apiError = {
    code: 'INVALID_REQUEST_400',
    httpStatus: 400,
    modelId: model,
    message,
    retryable: false,
    rawMessage: message,
  };
  return error;
}

function extractFunctionCalls(parts: any[]): Array<{ name: string; args: Record<string, unknown>; id: string }> {
  return parts
    .filter((part: any) => part?.functionCall)
    .map((part: any) => ({
      name: String(part.functionCall.name || ''),
      args: part.functionCall.args && typeof part.functionCall.args === 'object' && !Array.isArray(part.functionCall.args)
        ? part.functionCall.args
        : {},
      id: String(part.functionCall.id || ''),
    }))
    .filter((call) => call.name);
}

async function runGenerateContentTurn(
  options: ResilientStreamTurnOptions,
  model: string,
): Promise<{ value: GenerateContentTurnValue; emittedOutput: boolean }> {
  const config = options.buildConfig(model);
  const partsByCallKey = new Map<string, any>();
  let usage: any;

  const stream = await options.ai.models.generateContentStream({
    model,
    contents: options.contents,
    config,
  });

  for await (const chunk of stream as any) {
    if (options.signal?.aborted) {
      throw options.signal.reason || new DOMException('Aborted', 'AbortError');
    }

    usage = chunk?.usageMetadata || usage;

    const promptFeedback = chunk?.promptFeedback;
    if (promptFeedback?.blockReason) {
      options.onChunk({
        finishReason: String(promptFeedback.blockReason),
        safetyRatings: promptFeedback.safetyRatings || [],
      });
      throw safetyError(model, {
        source: 'promptFeedback',
        blockReason: promptFeedback.blockReason,
        safetyRatings: promptFeedback.safetyRatings || [],
      });
    }

    if (typeof chunk?.text === 'string' && chunk.text) {
      options.onChunk({ text: chunk.text });
    }

    const candidates = Array.isArray(chunk?.candidates) ? chunk.candidates : [];
    for (const candidate of candidates) {
      const finishReason = candidate?.finishReason;
      const safetyRatings = candidate?.safetyRatings;
      if (finishReason) {
        options.onChunk({ finishReason: String(finishReason), safetyRatings });
      }

      if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT' || finishReason === 'BLOCKLIST') {
        throw safetyError(model, {
          source: 'candidate',
          finishReason,
          safetyRatings: safetyRatings || [],
        });
      }

      const candidateParts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
      for (let index = 0; index < candidateParts.length; index += 1) {
        const part = candidateParts[index];
        if (!part?.functionCall) continue;
        const key = String(part.functionCall.id || `${part.functionCall.name || 'call'}:${index}`);
        partsByCallKey.set(key, part);
      }
    }
  }

  const modelParts = [...partsByCallKey.values()];
  const functionCalls = extractFunctionCalls(modelParts);
  for (const call of functionCalls) {
    if (!call.id) {
      throw invalidRequestError(model, `Gemini returned function call [${call.name}] without a call id; refusing to construct an invalid follow-up turn.`);
    }
  }

  return {
    value: {
      functionCalls,
      modelParts,
      usage,
      interactionId: undefined,
    },
    emittedOutput: true,
  };
}

/**
 * Production Chat transport. GenerateContent is deliberately used here because Elara's
 * Chat workload requires request-level safetySettings, including BLOCK_NONE. The
 * Interactions API remains available through its dedicated runtime for other callers.
 */
export async function runResilientGeminiStreamTurn(options: ResilientStreamTurnOptions): Promise<ResilientStreamTurnResult> {
  const policy: ModelResiliencePolicy = options.policy || (options.reliabilitySettings
    ? buildModelResiliencePolicy(options.reliabilitySettings)
    : {
        preferenceOrder: [options.preferredModel],
        fallbackModels: [],
        failoverEnabled: false,
        retryPolicy: { maxAttempts: 1 },
      });

  const result = await runWithModelResilience(
    options.preferredModel,
    (model) => runGenerateContentTurn(options, model),
    {
      ...policy,
      conversationId: options.conversationId ?? policy.conversationId,
      requestId: options.requestId ?? policy.requestId,
    },
    options.stateStore as ModelResilienceStateStore | undefined,
  );

  return {
    model: result.context.model,
    usedFallback: result.context.usedFallback,
    probingPreferred: result.context.probingPreferred,
    attempts: result.context.attempts,
    ...result.value,
  };
}

/** Compatibility helper retained for historical tests/consumers. */
export function normalizeGeminiToolHistory(contents: any[]): any[] {
  for (const content of contents) if (content?.role === 'tool') content.role = 'user';
  return contents;
}

function hasThoughtSignature(part: any): boolean {
  return (typeof part?.thoughtSignature === 'string' && part.thoughtSignature.length > 0)
    || (typeof part?.thought_signature === 'string' && part.thought_signature.length > 0);
}

function validationError(model: string, message: string): Error {
  const error = new Error(message);
  (error as any).apiError = { code: 'INVALID_REQUEST_400', httpStatus: 400, modelId: model, message, retryable: false, rawMessage: message };
  return error;
}

/** Compatibility-only Gemini 3 validator retained for regression coverage. */
export function validateGeminiToolHistory(contents: any[], model: string): void {
  if (!isGemini3Model(model)) return;
  let currentModelTurnIndex = -1;
  for (let index = contents.length - 1; index >= 0; index -= 1) {
    const content = contents[index];
    if (content?.role === 'model' && Array.isArray(content.parts) && content.parts.some((part: any) => part?.functionCall)) {
      currentModelTurnIndex = index;
      break;
    }
  }
  if (currentModelTurnIndex < 0) return;

  const currentCalls = contents[currentModelTurnIndex].parts.filter((part: any) => part?.functionCall);
  if (!hasThoughtSignature(currentCalls[0])) throw validationError(model, 'Gemini 3 rejected the tool turn because the original first function-call thought signature was not preserved.');

  const callIds = new Set<string>();
  for (const part of currentCalls) {
    const id = part?.functionCall?.id;
    if (typeof id !== 'string' || !id) throw validationError(model, 'Gemini 3 function-call history is missing a function-call id.');
    callIds.add(id);
  }

  for (let index = currentModelTurnIndex + 1; index < contents.length; index += 1) {
    const content = contents[index];
    if (content?.role !== 'user' || !Array.isArray(content.parts)) break;
    for (const part of content.parts.filter((item: any) => item?.functionResponse)) {
      const responseId = part.functionResponse?.id;
      if (typeof responseId !== 'string' || !callIds.has(responseId)) throw validationError(model, 'Gemini 3 function-response id does not match a function-call id from the preceding model turn.');
    }
  }

  for (let index = currentModelTurnIndex + 1; index < contents.length; index += 1) {
    const content = contents[index];
    if (content?.role !== 'model' || !Array.isArray(content.parts) || !content.parts.some((part: any) => part?.functionCall)) continue;
    const calls = content.parts.filter((part: any) => part?.functionCall);
    if (!hasThoughtSignature(calls[0])) throw validationError(model, 'Gemini 3 rejected a sequential function-call turn because its original thought signature was not preserved.');
    for (const part of calls) {
      const id = part?.functionCall?.id;
      if (typeof id !== 'string' || !id) throw validationError(model, 'Gemini 3 sequential function-call history is missing a function-call id.');
    }
  }
}
