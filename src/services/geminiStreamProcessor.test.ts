import assert from 'node:assert/strict';
import test from 'node:test';
import { processGeminiResponseStream } from './geminiStreamProcessor';

async function* streamOf(...chunks: any[]) {
  for (const chunk of chunks) yield chunk;
}

test('emits text and thought chunks while collecting model parts', async () => {
  const emitted: any[] = [];
  const result = await processGeminiResponseStream({
    model: 'model-a',
    responseStream: streamOf(
      { candidates: [{ content: { parts: [{ text: 'hello ' }] } }] },
      { candidates: [{ content: { parts: [{ text: 'world' }] } }] },
      { candidates: [{ content: { parts: [{ thought: true, text: 'thinking' }] } }] },
    ),
    onChunk: (chunk) => emitted.push(chunk),
  });

  assert.equal(result.emittedOutput, true);
  assert.deepEqual(result.functionCalls, []);
  assert.equal(result.modelParts.length, 3);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(emitted.some((chunk) => chunk.text === 'hello world'));
  assert.ok(emitted.some((chunk) => chunk.thoughtText === 'thinking'));
});

test('flushes before function calls and returns the calls', async () => {
  const emitted: any[] = [];
  const result = await processGeminiResponseStream({
    model: 'model-a',
    responseStream: streamOf({
      candidates: [{ content: { parts: [{ text: 'before' }, { functionCall: { name: 'foo', args: { x: 1 } } }] } }],
    }),
    onChunk: (chunk) => emitted.push(chunk),
  });

  assert.deepEqual(result.functionCalls, [{ name: 'foo', args: { x: 1 } }]);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0]?.text, 'before');
  assert.equal(emitted[0]?.finishReason, undefined);
  assert.equal(emitted[0]?.safetyRatings, undefined);
});

test('stops on abort without turning the result into an error', async () => {
  const controller = new AbortController();
  controller.abort();
  const emitted: any[] = [];

  const result = await processGeminiResponseStream({
    model: 'model-a',
    responseStream: streamOf({ text: 'ignored' }),
    onChunk: (chunk) => emitted.push(chunk),
    signal: controller.signal,
  });

  assert.equal(result.emittedOutput, false);
  assert.deepEqual(result.functionCalls, []);
  assert.deepEqual(emitted, []);
});

test('classifies a post-output stream failure as non-retryable', async () => {
  async function* failingStream() {
    yield { text: 'partial' };
    throw new Error('connection lost');
  }

  await assert.rejects(
    processGeminiResponseStream({
      model: 'model-a',
      responseStream: failingStream(),
      onChunk: () => undefined,
    }),
    (error: any) => error?.apiError?.retryable === false && error?.apiError?.failoverOverride === false,
  );
});
