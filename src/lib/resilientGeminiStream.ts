import { GoogleGenAI } from '@google/genai';
import { ModelResiliencePolicy, ModelResilienceStateStore, runWithModelResilience } from './modelResilience';
import type { ReliabilitySettings } from './reliabilitySettings';
import { buildModelResiliencePolicy } from './modelResilience';
import { emitResilienceStatus } from './resilienceStatus';
import { emitResilienceDiagnostic } from './resilienceDiagnostics';
import { processGeminiResponseStream } from '../services/geminiStreamProcessor';
import { countGeminiRequestTokens, type GeminiRequestTokenMeasurement, type GeminiRequestUsageTelemetry } from './geminiRequestTelemetry';
import { isGemini3Model } from './modelRegistry';

const requestIdsByContents = new WeakMap<object, string>();

function getStableRequestId(contents: any[]): string | undefined {
  if (!contents || (typeof contents !== 'object' && typeof contents !== 'function')) return undefined;
  const existing = requestIdsByContents.get(contents);
  if (existing) return existing;
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  const requestId = `request-${random}`;
  requestIdsByContents.set(contents, requestId);
  return requestId;
}

/**
 * Gemini GenerateContent uses role=user for functionResponse content. Some
 * legacy Elara callers still construct role=tool blocks, so normalize them at
 * the single provider boundary before countTokens and generation.
 */
export function normalizeGeminiToolHistory(contents: any[]): any[] {
  for (const content of contents) {
    if (content?.role === 'tool') content.role = 'user';
  }
  return contents;
}

function hasThoughtSignature(part: any): boolean {
  return (typeof part?.thoughtSignature === 'string' && part.thoughtSignature.length > 0)
    || (typeof part?.thought_signature === 'string' && part.thought_signature.length > 0);
}

function isStandardUserContent(content: any): boolean {
  if (content?.role !== 'user' || !Array.isArray(content.parts)) return false;
  return content.parts.some((part: any) => typeof part?.text === 'string')
    && !content.parts.some((part: any) => part?.functionResponse);
}

function failToolHistory(model: string, message: string): never {
  const error = new Error(message);
  (error as any).apiError = {
    code: 'INVALID_REQUEST_400',
    httpStatus: 400,
    modelId: model,
    message,
    retryable: false,
    rawMessage: message,
  };
  throw error;
}

/**
 * Validate only the current Gemini 3 function-calling turn. Previous turns do
 * not need to be revalidated. For parallel calls, Gemini puts the signature on
 * the first functionCall part only. For sequential calls, each model step has
 * its own first functionCall and therefore its own signature.
 */
export function validateGeminiToolHistory(contents: any[], model: string): void {
  if (!isGemini3Model(model)) return;

  let currentTurnStarted = false;
  const outstandingCallIds = new Set<string>();

  for (const content of contents) {
    if (isStandardUserContent(content)) {
      currentTurnStarted = true;
      outstandingCallIds.clear();
      continue;
    }
    if (!currentTurnStarted) continue;

    if (content?.role === 'model' && Array.isArray(content.parts)) {
      const functionCallParts = content.parts.filter((part: any) => Boolean(part?.functionCall));
      if (functionCallParts.length === 0) continue;

      for (let index = 0; index < functionCallParts.length; index++) {
        const part = functionCallParts[index];
        const call = part.functionCall;
        const callId = typeof call?.id === 'string' ? call.id : '';
        if (!callId) failToolHistory(model, 'Gemini 3 function-call history is missing a function-call id; refusing to submit the tool turn.');
        if (index === 0 && !hasThoughtSignature(part)) {
          failToolHistory(model, 'Gemini 3 function-call history is missing the required thought signature on the first function-call part of a model step.');
        }
        outstandingCallIds.add(callId);
      }
      continue;
    }

    if (content?.role === 'user' && Array.isArray(content.parts)) {
      const responses = content.parts.filter((part: any) => Boolean(part?.functionResponse));
      if (responses.length === 0) continue;
      for (const part of responses) {
        const responseId = typeof part.functionResponse?.id === 'string' ? part.functionResponse.id : '';
        if (!responseId || !outstandingCallIds.has(responseId)) {
          failToolHistory(model, 'Gemini 3 function-response history does not match a preceding function-call id; refusing to submit the tool turn.');
        }
        outstandingCallIds.delete(responseId);
      }
    }
  }
}

export interface ResilientStreamTurnResult {
  model: string;
  usedFallback: boolean;
  probingPreferred: boolean;
  attempts: number;
  functionCalls: any[];
  modelParts: any[];
  tokenMeasurement?: GeminiRequestTokenMeasurement;
  usage?: GeminiRequestUsageTelemetry;
}

export interface ResilientStreamTurnOptions {
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

export async function runResilientGeminiStreamTurn(
  options: ResilientStreamTurnOptions,
): Promise<ResilientStreamTurnResult> {
  const policy = options.policy || (options.reliabilitySettings ? buildModelResiliencePolicy(options.reliabilitySettings) : undefined);
  const requestId = options.requestId ?? policy?.requestId ?? getStableRequestId(options.contents);
  const result = await runWithModelResilience(
    options.preferredModel,
    async (model) => {
      const config = options.buildConfig(model);
      const providerContents = normalizeGeminiToolHistory(options.contents);
      validateGeminiToolHistory(providerContents, model);
      const tokenMeasurement = await countGeminiRequestTokens(options.ai, model, providerContents, config);

      emitResilienceDiagnostic({
        kind: 'METRIC',
        provider: 'google',
        conversationId: options.conversationId,
        requestId,
        preferredModel: options.preferredModel,
        actualModel: model,
        countedInputTokens: tokenMeasurement.countedInputTokens,
        tokenCountError: tokenMeasurement.countError,
        message: tokenMeasurement.countedInputTokens !== undefined
          ? `Counted Gemini input before generation: ${tokenMeasurement.countedInputTokens} tokens.`
          : 'Gemini input token count was unavailable before generation.',
      });

      const responseStream = await options.ai.models.generateContentStream({
        model,
        contents: providerContents,
        config,
      });

      const streamResult = await processGeminiResponseStream({
        model,
        responseStream,
        onChunk: options.onChunk,
        signal: options.signal,
      });

      if (streamResult.usage) {
        emitResilienceDiagnostic({
          kind: 'SUCCESS',
          outcome: 'success',
          provider: 'google',
          conversationId: options.conversationId,
          requestId,
          preferredModel: options.preferredModel,
          actualModel: model,
          observedInputTokens: streamResult.usage.inputTokenCount,
          observedOutputTokens: streamResult.usage.outputTokenCount,
          observedThoughtsTokens: streamResult.usage.thoughtsTokenCount,
          observedToolUsePromptTokens: streamResult.usage.toolUsePromptTokenCount,
          observedCachedContentTokens: streamResult.usage.cachedContentTokenCount,
          observedTotalTokens: streamResult.usage.totalTokenCount,
          message: 'Gemini returned usage metadata for the streamed request.',
        });
      }

      return {
        value: {
          functionCalls: streamResult.functionCalls,
          modelParts: streamResult.modelParts,
          tokenMeasurement,
          usage: streamResult.usage,
        },
        emittedOutput: streamResult.emittedOutput,
      };
    },
    {
      ...policy,
      conversationId: options.conversationId ?? policy?.conversationId,
      requestId,
    },
    options.stateStore,
  );

  const statusKind = result.context.probingPreferred || result.context.attempts > 1
    ? 'recovered'
    : result.context.usedFallback
      ? 'fallback'
      : null;

  if (statusKind) {
    emitResilienceStatus({
      kind: statusKind,
      model: result.context.model,
      preferredModel: options.preferredModel,
      attempts: result.context.attempts,
      usedFallback: result.context.usedFallback,
      probingPreferred: result.context.probingPreferred,
    });
  }

  return {
    model: result.context.model,
    usedFallback: result.context.usedFallback,
    probingPreferred: result.context.probingPreferred,
    attempts: result.attempts,
    functionCalls: result.value.functionCalls,
    modelParts: result.value.modelParts,
    tokenMeasurement: result.value.tokenMeasurement,
    usage: result.value.usage,
  };
}
