import { GoogleGenAI } from '@google/genai';
import { ModelResiliencePolicy, ModelResilienceStateStore, runWithModelResilience } from './modelResilience';
import type { ReliabilitySettings } from './reliabilitySettings';
import { buildModelResiliencePolicy } from './modelResilience';
import { emitResilienceStatus } from './resilienceStatus';
import { processGeminiResponseStream } from '../services/geminiStreamProcessor';

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
  conversationId?: string;
  requestId?: string;
}

export async function runResilientGeminiStreamTurn(
  options: ResilientStreamTurnOptions,
): Promise<ResilientStreamTurnResult> {
  const policy = options.policy || (options.reliabilitySettings ? buildModelResiliencePolicy(options.reliabilitySettings) : undefined);
  const result = await runWithModelResilience(
    options.preferredModel,
    async (model) => {
      const responseStream = await options.ai.models.generateContentStream({
        model,
        contents: options.contents,
        config: options.buildConfig(model),
      });

      const streamResult = await processGeminiResponseStream({
        model,
        responseStream,
        onChunk: options.onChunk,
        signal: options.signal,
      });

      return {
        value: {
          functionCalls: streamResult.functionCalls,
          modelParts: streamResult.modelParts,
        },
        emittedOutput: streamResult.emittedOutput,
      };
    },
    {
      ...policy,
      conversationId: options.conversationId ?? policy?.conversationId,
      requestId: options.requestId ?? policy?.requestId,
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
  };
}
