import test from 'node:test';
import assert from 'node:assert/strict';
import { runResilientGeminiInteractionTurn } from '../geminiInteractionsRuntime';
import {
  clearResilienceDiagnosticHistory,
  subscribeResilienceDiagnostics,
} from '../resilienceDiagnostics';

test('reuses one diagnostic request ID across repeated interaction turns sharing the same contents array', async () => {
  clearResilienceDiagnosticHistory();

  const requestIds: string[] = [];
  const unsubscribe = subscribeResilienceDiagnostics((event) => {
    if (event.kind === 'REQUEST' && event.requestId) requestIds.push(event.requestId);
  });

  async function* interactionStream() {
    yield { event_type: 'interaction.created', interaction: { id: 'int-1' } };
    yield { event_type: 'interaction.completed', interaction: { id: 'int-1', status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'ok' }] }], usage: { total_input_tokens: 1, total_output_tokens: 1, total_tokens: 2 } } };
  }

  const ai = { interactions: { create: async () => interactionStream(), delete: async () => undefined } } as any;
  const contents: any[] = [{ role: 'user', parts: [{ text: 'hello' }] }];
  const requestId = 'request-shared-test';

  try {
    await runResilientGeminiInteractionTurn({ ai, preferredModel: 'gemini-3.6-flash', contents, buildConfig: () => ({}), onChunk: () => undefined, requestId });
    contents.push({ role: 'model', parts: [{ text: 'ok' }] });
    await runResilientGeminiInteractionTurn({ ai, preferredModel: 'gemini-3.6-flash', contents, buildConfig: () => ({}), onChunk: () => undefined, requestId });
  } finally {
    unsubscribe();
  }

  assert.equal(requestIds.length, 2);
  assert.equal(requestIds[0], requestId);
  assert.equal(requestIds[1], requestId);
});
