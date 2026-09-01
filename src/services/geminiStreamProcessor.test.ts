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
  assert.equal(result.modelParts.length, 2);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0]?.text, 'before');
});

test('preserves empty-text thought signature parts for replay', async () => {
  const signature = 'signature-123';
  const emptySignaturePart = { text: '', thoughtSignature: signature };
  const result = await processGeminiResponseStream({
    model: 'gemini-3.7-flash',
    responseStream: streamOf({
      candidates: [{
        content: {
          parts: [
            { thought: true, text: 'thinking' },
            { text: 'answer' },
            emptySignaturePart,
          ],
        },
      }],
    }),
    onChunk: () => undefined,
  });

  assert.equal(result.modelParts.length, 3);
  assert.strictEqual(result.modelParts[2], emptySignaturePart);
  assert.equal(result.modelParts[2].thoughtSignature, signature);
});

test('preserves model parts in exact streamed order, including non-text parts', async () => {
  const parts = [
    { thought: true, text: 'think' },
    { functionCall: { name: 'foo', args: {}, id: 'call-1' }, thoughtSignature: 'sig-1' },
    { inlineData: { mimeType: 'image/png', data: 'AAAA' }, thoughtSignature: 'sig-2' },
  ];
  const result = await processGeminiResponseStream({
    model: 'gemini-3.7-flash',
    responseStream: streamOf(
      { candidates: [{ content: { parts: [parts[0]] } }] },
      { candidates: [{ content: { parts: [parts[1]] } }] },
      { candidates: [{ content: { parts: [parts[2]] } }] },
    ),
    onChunk: () => undefined,
  });

  assert.deepEqual(result.modelParts, parts);
  assert.deepEqual(result.functionCalls, [parts[1].functionCall]);
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
