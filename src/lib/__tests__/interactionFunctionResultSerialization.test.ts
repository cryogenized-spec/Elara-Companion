import test from 'node:test';
import assert from 'node:assert/strict';
import { runResilientGeminiInteractionTurn } from '../geminiInteractionsRuntime';

async function runTwoTurnToolScenario(toolName: string, toolResult: unknown) {
  const requests: any[] = [];
  let callCount = 0;

  async function* firstStream() {
    yield { event_type: 'interaction.created', interaction: { id: `int-${toolName}-1` } };
    yield { event_type: 'interaction.completed', interaction: {
      id: `int-${toolName}-1`,
      status: 'requires_action',
      steps: [{ type: 'function_call', id: `call-${toolName}`, name: toolName, arguments: {} }],
    } };
  }

  async function* secondStream() {
    yield { event_type: 'interaction.created', interaction: { id: `int-${toolName}-2` } };
    yield { event_type: 'interaction.completed', interaction: {
      id: `int-${toolName}-2`,
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
      delete: async () => undefined,
    },
  } as any;

  const contents: any[] = [{ role: 'user', parts: [{ text: `Run ${toolName}.` }] }];
  await runResilientGeminiInteractionTurn({
    ai,
    preferredModel: 'gemini-3.7-flash',
    buildConfig: () => ({}),
    contents,
    onChunk: () => undefined,
    requestId: `${toolName}-serialization-test`,
  });

  contents.push({ role: 'model', parts: [{ functionCall: { name: toolName, args: {}, id: `call-${toolName}` } }] });
  contents.push({ role: 'tool', parts: [{ functionResponse: { name: toolName, response: toolResult, id: `call-${toolName}` } }] });

  await runResilientGeminiInteractionTurn({
    ai,
    preferredModel: 'gemini-3.7-flash',
    buildConfig: () => ({}),
    contents,
    onChunk: () => undefined,
    requestId: `${toolName}-serialization-test`,
  });

  return requests[1];
}

test('serializes Google Tasks function results as typed text content', async () => {
  const request = await runTwoTurnToolScenario('get_pending_google_tasks', {
    success: true,
    count: 2,
    tasks: [{ id: 'task-1', title: 'Repair KWC SP-2022', status: 'needsAction' }],
  });

  assert.deepEqual(request.input[0].result, [{
    type: 'text',
    text: JSON.stringify({
      success: true,
      count: 2,
      tasks: [{ id: 'task-1', title: 'Repair KWC SP-2022', status: 'needsAction' }],
    }),
  }]);
});

test('serializes Google Calendar function results as typed text content', async () => {
  const request = await runTwoTurnToolScenario('get_calendar_events_range', {
    success: true,
    count: 1,
    startTime: '2026-09-01T00:00:00.000Z',
    endTime: '2026-09-02T00:00:00.000Z',
    events: [{
      id: 'event-1',
      summary: 'Repair work',
      start: { dateTime: '2026-09-01T09:00:00+02:00' },
      end: { dateTime: '2026-09-01T10:00:00+02:00' },
      status: 'confirmed',
    }],
  });

  assert.deepEqual(request.input[0].result, [{
    type: 'text',
    text: JSON.stringify({
      success: true,
      count: 1,
      startTime: '2026-09-01T00:00:00.000Z',
      endTime: '2026-09-02T00:00:00.000Z',
      events: [{
        id: 'event-1',
        summary: 'Repair work',
        start: { dateTime: '2026-09-01T09:00:00+02:00' },
        end: { dateTime: '2026-09-01T10:00:00+02:00' },
        status: 'confirmed',
      }],
    }),
  }]);
});
