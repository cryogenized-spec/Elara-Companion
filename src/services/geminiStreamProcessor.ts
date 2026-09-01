import { classifyApiError } from '../lib/apiError';
import { extractGeminiUsageMetadata, type GeminiRequestUsageTelemetry } from '../lib/geminiRequestTelemetry';

export type StreamChunk = {
  text?: string;
  thoughtText?: string;
  thoughtType?: 'summary';
  finishReason?: string;
  safetyRatings?: any;
};

export type ProcessGeminiStreamOptions = {
  model: string;
  responseStream: AsyncIterable<any>;
  onChunk: (chunk: StreamChunk) => void;
  signal?: AbortSignal;
};

export type ProcessGeminiStreamResult = {
  emittedOutput: boolean;
  functionCalls: any[];
  modelParts: any[];
  usage?: GeminiRequestUsageTelemetry;
};

const STREAM_UI_BATCH_WINDOW_MS = 16;

function createChunkBatcher(onChunk: (chunk: StreamChunk) => void) {
  let pending: StreamChunk | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const flush = () => {
    clearTimer();
    if (!pending) return;
    const next = pending;
    pending = null;
    onChunk(next);
  };

  const enqueue = (chunk: StreamChunk) => {
    const kind = chunk.thoughtText !== undefined ? 'thought' : chunk.text !== undefined ? 'text' : 'other';
    const pendingKind = pending
      ? pending.thoughtText !== undefined
        ? 'thought'
        : pending.text !== undefined
          ? 'text'
          : 'other'
      : null;

    if (!pending || pendingKind !== kind || kind === 'other') {
      flush();
      pending = { ...chunk };
    } else if (kind === 'thought') {
      pending.thoughtText = `${pending.thoughtText || ''}${chunk.thoughtText || ''}`;
      pending.thoughtType = chunk.thoughtType || pending.thoughtType;
      pending.finishReason = chunk.finishReason || pending.finishReason;
      pending.safetyRatings = chunk.safetyRatings || pending.safetyRatings;
    } else {
      pending.text = `${pending.text || ''}${chunk.text || ''}`;
      pending.finishReason = chunk.finishReason || pending.finishReason;
      pending.safetyRatings = chunk.safetyRatings || pending.safetyRatings;
    }

    if (kind === 'other') flush();
    else if (timer === null) timer = setTimeout(flush, STREAM_UI_BATCH_WINDOW_MS);
  };

  return { enqueue, flush };
}

export async function processGeminiResponseStream(
  options: ProcessGeminiStreamOptions,
): Promise<ProcessGeminiStreamResult> {
  let emittedOutput = false;
  const functionCalls: any[] = [];
  const modelParts: any[] = [];
  let usage: GeminiRequestUsageTelemetry | undefined;
  const batcher = createChunkBatcher(options.onChunk);

  try {
    for await (const chunk of options.responseStream) {
      if (options.signal?.aborted) break;

      const chunkUsage = extractGeminiUsageMetadata(chunk);
      if (chunkUsage) usage = chunkUsage;

      const candidate = chunk.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const safetyRatings = candidate?.safetyRatings;
      const parts = candidate?.content?.parts;

      if (Array.isArray(parts) && parts.length > 0) {
        for (const part of parts) {
          // Preserve every provider part exactly as received. Gemini 3 can
          // place a required thought signature on an empty-text part, and
          // non-text/non-function-call parts can also be required for replay.
          modelParts.push(part);

          if ((part as any).thought && part.text) {
            emittedOutput = true;
            batcher.enqueue({ thoughtText: part.text, thoughtType: 'summary' });
          } else if ((part as any).functionCall) {
            emittedOutput = true;
            batcher.flush();
            functionCalls.push((part as any).functionCall);
          } else if (part.text) {
            emittedOutput = true;
            batcher.enqueue({ text: part.text, finishReason, safetyRatings });
          }
        }
      } else if (chunk.text) {
        emittedOutput = true;
        batcher.enqueue({ text: chunk.text, finishReason, safetyRatings });
      } else if (finishReason) {
        batcher.flush();
        options.onChunk({ finishReason, safetyRatings });
      }
    }
  } catch (error) {
    batcher.flush();
    if (emittedOutput) {
      const classified = classifyApiError(error, options.model);
      throw Object.assign(new Error(classified.message), {
        apiError: { ...classified, retryable: false, failoverOverride: false },
      });
    }
    throw error;
  } finally {
    batcher.flush();
  }

  return { emittedOutput, functionCalls, modelParts, usage };
}
