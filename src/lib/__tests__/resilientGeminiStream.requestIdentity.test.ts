import test from 'node:test';
import assert from 'node:assert/strict';
import { runResilientGeminiStreamTurn } from '../resilientGeminiStream';
import {
  clearResilienceDiagnosticHistory,
  subscribeResilienceDiagnostics,
} from '../resilienceDiagnostics';

test('reuses one diagnostic request ID across repeated turns sharing the same contents array', async () => {
  clearResilienceDiagnosticHistory();

  const requestIds: string[] = [];
  const unsubscribe = subscribeResilienceDiagnostics((event) => {
    if (event.kind === 'REQUEST' && event.requestId) requestIds.push(event.requestId);
  });

  async function* responseStream() {
    yield {
      candidates: [{
        content: { parts: [{ text: 'ok' }] },
        finishReason: 'STOP',
      }],
    };
  }

  const ai = {
    models: {
      generateContentStream: async () => responseStream(),
    },
  } as any;

  const contents: any[] = [{ role: 'user', parts: [{ text: 'hello' }] }];

  try {
    await runResilientGeminiStreamTurn({
      ai,
      preferredModel: 'gemini-3.6-flash',
      contents,
      buildConfig: () => ({}),
      onChunk: () => undefined,
    });

    contents.push({ role: 'model', parts: [{ text: 'ok' }] });

    await runResilientGeminiStreamTurn({
      ai,
      preferredModel: 'gemini-3.6-flash',
      contents,
      buildConfig: () => ({}),
      onChunk: () => undefined,
    });
  } finally {
    unsubscribe();
  }

  assert.equal(requestIds.length, 2);
  assert.equal(requestIds[0], requestIds[1]);
  assert.match(requestIds[0], /^request-/);
});
