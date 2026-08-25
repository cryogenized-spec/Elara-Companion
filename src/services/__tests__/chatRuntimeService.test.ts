import assert from 'node:assert/strict';
import test from 'node:test';
import { executeChatRuntime } from '../chatRuntimeService';
import type { BackgroundRuntimeContract, GeminiRuntimeContract } from '../../contracts';

function createRuntimeMock(chunks: Array<{ text?: string }>): GeminiRuntimeContract {
  return {
    async stream(request) {
      for (const chunk of chunks) request.onChunk(chunk);
    },
    normalizeWorkspace(workspace) {
      return workspace;
    },
  };
}

function createBackgroundMock(overrides: Partial<BackgroundRuntimeContract> = {}): BackgroundRuntimeContract {
  return {
    isEnabled: () => false,
    isConfigured: () => true,
    loadPersistedJobs: () => [],
    persistJob: () => undefined,
    removeJob: () => undefined,
    createChatJob: async () => ({ id: 'job_1' }),
    getJob: async () => ({ id: 'job_1', status: 'completed' }),
    waitForJob: async () => ({ id: 'job_1', status: 'completed' }),
    ...overrides,
  };
}

test('direct runtime execution delegates to the canonical runtime contract', async () => {
  const chunks: Array<{ text?: string }> = [];
  let calls = 0;

  await executeChatRuntime({
    conversationId: 'conv_1',
    assistantMessageId: 'msg_1',
    message: 'hello',
    history: [],
    systemPrompt: 'system',
    model: 'gemini-test',
    apiKey: 'test-key',
    runtime: {
      ...createRuntimeMock([{ text: 'hello back' }]),
      async stream(request) {
        calls += 1;
        request.onChunk({ text: 'hello back' });
      },
    },
    background: createBackgroundMock(),
    onChunk: (chunk) => chunks.push(chunk),
  });

  assert.equal(calls, 1);
  assert.deepEqual(chunks, [{ text: 'hello back' }]);
});

test('accepted durable execution returns its completed result without starting a second Gemini stream', async () => {
  let runtimeCalls = 0;
  const chunks: Array<{ text?: string }> = [];
  let removedJob: string | null = null;

  const background = createBackgroundMock({
    isEnabled: () => true,
    createChatJob: async () => ({ id: 'job_42' }),
    waitForJob: async () => ({
      id: 'job_42',
      status: 'completed',
      output: { result: { text: 'durable answer' } },
    }),
    removeJob: (jobId) => { removedJob = jobId; },
  });

  await executeChatRuntime({
    conversationId: 'conv_1',
    assistantMessageId: 'msg_1',
    message: 'hello',
    history: [],
    systemPrompt: 'system',
    model: 'gemini-test',
    runtime: {
      ...createRuntimeMock([]),
      async stream() { runtimeCalls += 1; },
    },
    background,
    onChunk: (chunk) => chunks.push(chunk),
  });

  assert.equal(runtimeCalls, 0);
  assert.deepEqual(chunks, [{ text: 'durable answer', finishReason: undefined, workspace: undefined, artifactIds: [] }]);
  assert.equal(removedJob, 'job_42');
});

test('backend fallback parses streamed SSE chunks through the same runtime callback', async () => {
  const chunks: Array<{ text?: string }> = [];
  const payload = [
    'data: {"text":"first"}\n\n',
    'data: {"text":"second"}\n\n',
    'data: {"done":true}\n\n',
  ].join('');
  const encoder = new TextEncoder();
  const bytes = encoder.encode(payload);
  let consumed = false;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
    return new Response(stream, { status: 200 });
  };

  try {
    await executeChatRuntime({
      conversationId: 'conv_1',
      assistantMessageId: 'msg_1',
      message: 'hello',
      history: [],
      systemPrompt: 'system',
      model: 'gemini-test',
      runtime: createRuntimeMock([]),
      background: createBackgroundMock(),
      onChunk: (chunk) => {
        consumed = true;
        chunks.push(chunk);
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(consumed, true);
  assert.deepEqual(chunks.map((chunk) => chunk.text), ['first', 'second', undefined]);
});
