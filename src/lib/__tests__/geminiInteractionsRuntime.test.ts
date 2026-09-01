import test from 'node:test';
import assert from 'node:assert/strict';
import { runResilientGeminiInteractionTurn } from '../geminiInteractionsRuntime';

test('uses interaction state for tool continuation and cleans up terminal interactions', async () => {
  const requests: any[] = [];
  const deleted: string[] = [];
  let callCount = 0;

  async function* firstStream() {
    yield { event_type: 'interaction.created', interaction: { id: 'int-1' } };
    yield { event_type: 'interaction.completed', interaction: {
      id: 'int-1',
      status: 'requires_action',
      steps: [{ type: 'function_call', id: 'call-1', name: 'list_google_tasks', arguments: {} }],
    } };
  }

  async function* secondStream() {
    yield { event_type: 'interaction.created', interaction: { id: 'int-2' } };
    yield { event_type: 'interaction.completed', interaction: {
      id: 'int-2',
      status: 'completed',
      steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Done.' }] }],
      usage: { total_input_tokens: 10, total_output_tokens: 2, total_tokens: 12 },
    } };
  }

  const ai = {
    interactions: {
      create: async (request: any) => {
        requests.push(request);
        callCount += 1;
        return callCount === 1 ? firstStream() : secondStream();
      },
      delete: async (id: string) => {
        deleted.push(id);
      },
    },
  } as any;

  const contents: any[] = [{ role: 'user', parts: [{ text: 'Show my tasks.' }] }];
  const first = await runResilientGeminiInteractionTurn({
    ai,
    preferredModel: 'gemini-3.7-flash',
    buildConfig: () => ({}),
    contents,
    onChunk: () => undefined,
    requestId: 'request-interaction-test',
  });

  assert.deepEqual(first.functionCalls, [{ name: 'list_google_tasks', args: {}, id: 'call-1' }]);
  assert.equal(first.interactionId, 'int-1');
  assert.equal(requests[0].previous_interaction_id, undefined);

  contents.push({ role: 'model', parts: [{ functionCall: { name: 'list_google_tasks', args: {}, id: 'call-1' } }] });
  contents.push({ role: 'tool', parts: [{ functionResponse: { name: 'list_google_tasks', response: { success: true, tasks: [] }, id: 'call-1' } }] });

  const second = await runResilientGeminiInteractionTurn({
    ai,
    preferredModel: 'gemini-3.7-flash',
    buildConfig: () => ({}),
    contents,
    onChunk: () => undefined,
    requestId: 'request-interaction-test',
  });

  assert.equal(requests[1].previous_interaction_id, 'int-1');
  assert.deepEqual(requests[1].input, [{ type: 'function_result', name: 'list_google_tasks', call_id: 'call-1', result: { success: true, tasks: [] } }]);
  assert.deepEqual(second.functionCalls, []);
  assert.equal(second.interactionId, 'int-2');
  assert.deepEqual(deleted, ['int-1', 'int-2']);
});

test('preserves streamed text through the Interactions runtime', async () => {
  async function* stream() {
    yield { event_type: 'interaction.created', interaction: { id: 'int-text' } };
    yield { event_type: 'step.delta', delta: { type: 'text', text: 'hello' } };
    yield { event_type: 'interaction.completed', interaction: { id: 'int-text', status: 'completed', steps: [] } };
  }

  const chunks: string[] = [];
  const ai = { interactions: { create: async () => stream(), delete: async () => undefined } } as any;
  await runResilientGeminiInteractionTurn({
    ai,
    preferredModel: 'gemini-3.7-flash',
    buildConfig: () => ({}),
    contents: [{ role: 'user', parts: [{ text: 'hello' }] }],
    onChunk: (chunk) => { if (chunk.text) chunks.push(chunk.text); },
    requestId: 'request-text-test',
  });

  assert.deepEqual(chunks, ['hello']);
});
