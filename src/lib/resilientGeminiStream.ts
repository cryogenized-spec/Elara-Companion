import { GoogleGenAI } from '@google/genai';
import { classifyApiError } from './apiError';
import { ModelResiliencePolicy, ModelResilienceStateStore, runWithModelResilience } from './modelResilience';
import type { ReliabilitySettings } from './reliabilitySettings';
import { buildModelResiliencePolicy } from './modelResilience';
import { emitResilienceStatus } from './resilienceStatus';

export interface ResilientStreamTurnResult {
  model: string;
  usedFallback: boolean;
  probingPreferred: boolean;
  attempts: number;
  functionCalls: any[];
  modelParts: any[];
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
}

export async function runResilientGeminiStreamTurn(
  options: ResilientStreamTurnOptions,
): Promise<ResilientStreamTurnResult> {
  const policy = options.policy || (options.reliabilitySettings ? buildModelResiliencePolicy(options.reliabilitySettings) : undefined);
  const result = await runWithModelResilience(
    options.preferredModel,
    async (model) => {
      let emittedOutput = false;
      const functionCalls: any[] = [];
      const modelParts: any[] = [];
      const responseStream = await options.ai.models.generateContentStream({
        model,
        contents: options.contents,
        config: options.buildConfig(model),
      });

      try {
        for await (const chunk of responseStream) {
          if (options.signal?.aborted) break;

          const candidate = chunk.candidates?.[0];
          const finishReason = candidate?.finishReason;
          const safetyRatings = candidate?.safetyRatings;
          const parts = candidate?.content?.parts;

          if (parts && parts.length > 0) {
            for (const part of parts) {
              if ((part as any).thought && part.text) {
                emittedOutput = true;
                options.onChunk({ thoughtText: part.text, thoughtType: 'summary' });
                modelParts.push(part);
              } else if ((part as any).functionCall) {
                emittedOutput = true;
                const fc = (part as any).functionCall;
                functionCalls.push(fc);
                modelParts.push(part);
              } else if (part.text) {
                emittedOutput = true;
                options.onChunk({ text: part.text, finishReason, safetyRatings });
                modelParts.push(part);
              }
            }
          } else if (chunk.text) {
            emittedOutput = true;
            options.onChunk({ text: chunk.text, finishReason, safetyRatings });
          } else if (finishReason) {
            options.onChunk({ finishReason, safetyRatings });
          }
        }
      } catch (error) {
        if (emittedOutput) {
          const classified = classifyApiError(error, model);
          throw Object.assign(new Error(classified.message), {
            apiError: { ...classified, retryable: false, failoverOverride: false },
          });
        }
        throw error;
      }

      return {
        value: { functionCalls, modelParts },
        emittedOutput,
      };
    },
    policy,
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
  };
}
