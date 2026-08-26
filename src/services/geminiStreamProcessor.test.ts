import { describe, expect, it, vi } from 'vitest';
import { processGeminiResponseStream } from './geminiStreamProcessor';

async function* streamOf(...chunks: any[]) {
  for (const chunk of chunks) yield chunk;
}

describe('geminiStreamProcessor', () => {
  it('emits text and thought chunks while collecting model parts', async () => {
    const emitted: any[] = [];
    const result = await processGeminiResponseStream({
      model: 'model-a',
      responseStream: streamOf(
        { candidates: [{ content: { parts: [{ text: 'hello ' }] } }] },
        { candidates: [{ content: { parts: [{ thought: true, text: 'thinking' }] } }] },
        { text: 'world' },
      ),
      onChunk: (chunk) => emitted.push(chunk),
    });

    expect(result.emittedOutput).toBe(true);
    expect(result.functionCalls).toEqual([]);
    expect(result.modelParts).toHaveLength(2);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(emitted.some((chunk) => chunk.text === 'hello world')).toBe(true);
    expect(emitted.some((chunk) => chunk.thoughtText === 'thinking')).toBe(true);
  });

  it('flushes before function calls and returns the calls', async () => {
    const emitted: any[] = [];
    const result = await processGeminiResponseStream({
      model: 'model-a',
      responseStream: streamOf(
        { candidates: [{ content: { parts: [{ text: 'before' }, { functionCall: { name: 'foo', args: { x: 1 } } }] } }] },
      ),
      onChunk: (chunk) => emitted.push(chunk),
    });

    expect(result.functionCalls).toEqual([{ name: 'foo', args: { x: 1 } }]);
    expect(emitted).toEqual([{ text: 'before' }]);
  });

  it('stops on abort without turning the result into an error', async () => {
    const controller = new AbortController();
    controller.abort();
    const onChunk = vi.fn();

    const result = await processGeminiResponseStream({
      model: 'model-a',
      responseStream: streamOf({ text: 'ignored' }),
      onChunk,
      signal: controller.signal,
    });

    expect(result.emittedOutput).toBe(false);
    expect(result.functionCalls).toEqual([]);
    expect(onChunk).not.toHaveBeenCalled();
  });

  it('classifies a post-output stream failure as non-retryable', async () => {
    async function* failingStream() {
      yield { text: 'partial' };
      throw new Error('connection lost');
    }

    const promise = processGeminiResponseStream({
      model: 'model-a',
      responseStream: failingStream(),
      onChunk: () => undefined,
    });

    await expect(promise).rejects.toMatchObject({
      apiError: { retryable: false, failoverOverride: false },
    });
  });
});
