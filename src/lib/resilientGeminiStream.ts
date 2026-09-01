import { GoogleGenAI } from '@google/genai';
import { ModelResiliencePolicy, ModelResilienceStateStore, runWithModelResilience } from './modelResilience';
import type { ReliabilitySettings } from './reliabilitySettings';
import { buildModelResiliencePolicy } from './modelResilience';
import { emitResilienceStatus } from './resilienceStatus';
import { emitResilienceDiagnostic } from './resilienceDiagnostics';
import { processGeminiResponseStream } from '../services/geminiStreamProcessor';
import { countGeminiRequestTokens, type GeminiRequestTokenMeasurement, type GeminiRequestUsageTelemetry } from './geminiRequestTelemetry';

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
      const tokenMeasurement = await countGeminiRequestTokens(options.ai, model, options.contents, config);

      emitResilienceDiagnostic({
        kind: 'REQUEST',
        outcome: 'success',
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
        contents: options.contents,
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
    attempts: result.context.attempts,
    functionCalls: result.value.functionCalls,
    modelParts: result.value.modelParts,
    tokenMeasurement: result.value.tokenMeasurement,
    usage: result.value.usage,
  };
}
