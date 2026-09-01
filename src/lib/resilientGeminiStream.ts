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

export function normalizeGeminiToolHistory(contents: any[]): any[] {
  for (const content of contents) {
    if (content?.role === 'tool') content.role = 'user';
  }
  return contents;
}

function hasThoughtSignature(part: any): boolean {
  return typeof part?.thoughtSignature === 'string' && part.thoughtSignature.length > 0
    || typeof part?.thought_signature === 'string' && part.thought_signature.length > 0;
}

export function validateGeminiToolHistory(contents: any[], model: string): void {
  if (!isGemini3Model(model)) return;

  for (const content of contents) {
    if (content?.role !== 'model' || !Array.isArray(content.parts)) continue;
    for (const part of content.parts) {
      if (part?.functionCall && !hasThoughtSignature(part)) {
        const error = new Error('Gemini 3 function-call history is missing the original thought signature; refusing to submit a reconstructed tool turn.');
        (error as any).apiError = {
          code: 'INVALID_REQUEST_400',
          httpStatus: 400,
          modelId: model,
          message: 'Gemini 3 rejected the tool turn because the original function-call thought signature was not preserved.',
          retryable: false,
          rawMessage: error.message,
        };
        throw error;
      }
    }
  }
}

function summarizeGeminiRequest(contents: any[], config: any) {
  let totalPartCount = 0;
  let modelPartCount = 0;
  let functionCallCount = 0;
  let functionResponseCount = 0;
  let functionCallIdsPresent = 0;
  let thoughtSignaturesPresent = 0;

  for (const content of contents || []) {
    const parts = Array.isArray(content?.parts) ? content.parts : [];
    totalPartCount += parts.length;
    if (content?.role === 'model') modelPartCount += parts.length;
    for (const part of parts) {
      if (part?.functionCall) {
        functionCallCount++;
        if (typeof part.functionCall.id === 'string' && part.functionCall.id.length > 0) functionCallIdsPresent++;
        if (hasThoughtSignature(part)) thoughtSignaturesPresent++;
      }
      if (part?.functionResponse) functionResponseCount++;
    }
  }

  const toolDeclarationCount = Array.isArray(config?.tools)
    ? config.tools.reduce((sum: number, tool: any) => sum + (Array.isArray(tool?.functionDeclarations) ? tool.functionDeclarations.length : 0), 0)
    : 0;

  return {
    contentsCount: Array.isArray(contents) ? contents.length : 0,
    totalPartCount,
    modelPartCount,
    functionCallCount,
    functionResponseCount,
    functionCallIdsPresent,
    thoughtSignaturesPresent,
    toolDeclarationCount,
  };
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
      const requestShape = summarizeGeminiRequest(providerContents, config);
      const phase = requestShape.functionResponseCount > 0 ? 'continuation' : 'generation';

      emitResilienceDiagnostic({
        kind: 'METRIC',
        provider: 'google',
        conversationId: options.conversationId,
        requestId,
        preferredModel: options.preferredModel,
        actualModel: model,
        phase,
        ...requestShape,
        message: 'Gemini request shape captured before provider validation and generation.',
      });

      try {
        validateGeminiToolHistory(providerContents, model);
      } catch (error: any) {
        const classified = error?.apiError;
        emitResilienceDiagnostic({
          kind: 'ERROR',
          outcome: 'failure',
          provider: 'google',
          conversationId: options.conversationId,
          requestId,
          preferredModel: options.preferredModel,
          actualModel: model,
          phase,
          ...requestShape,
          errorCode: classified?.code || 'INVALID_REQUEST_400',
          httpStatus: classified?.httpStatus || 400,
          providerErrorMessage: classified?.rawMessage || error?.message,
          message: classified?.message || 'Gemini 3 tool history validation failed before generation.',
        });
        throw error;
      }

      const tokenMeasurement = await countGeminiRequestTokens(options.ai, model, providerContents, config);

      emitResilienceDiagnostic({
        kind: 'METRIC',
        provider: 'google',
        conversationId: options.conversationId,
        requestId,
        preferredModel: options.preferredModel,
        actualModel: model,
        phase,
        ...requestShape,
        countedInputTokens: tokenMeasurement.countedInputTokens,
        tokenCountError: tokenMeasurement.countError,
        message: tokenMeasurement.countedInputTokens !== undefined
          ? `Counted Gemini input before generation: ${tokenMeasurement.countedInputTokens} tokens.`
          : 'Gemini input token count was unavailable before generation.',
      });

      try {
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
            phase: 'stream',
            ...requestShape,
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
      } catch (error: any) {
        const classified = error?.apiError;
        emitResilienceDiagnostic({
          kind: 'ERROR',
          outcome: 'failure',
          provider: 'google',
          conversationId: options.conversationId,
          requestId,
          preferredModel: options.preferredModel,
          actualModel: model,
          phase: 'stream',
          ...requestShape,
          countedInputTokens: tokenMeasurement.countedInputTokens,
          tokenCountError: tokenMeasurement.countError,
          errorCode: classified?.code,
          httpStatus: classified?.httpStatus,
          providerErrorMessage: classified?.rawMessage || error?.message,
          message: classified?.message || String(error?.message || error || 'Gemini generation or stream processing failed'),
        });
        throw error;
      }
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
