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
    isConfigured: () => false,
    loadPersistedJobs: () => [],
    persistJob: () => undefined,
    removeJob: () => undefined,
    createChatJob: async () => ({ id: 'job_1' }),
    getJob: async () => ({ id: 'job_1', status: 'completed' }),
    waitForJob: async () => ({ id: 'job_1', status: 'completed' }),
    ...overrides,
  };
}

test('foreground execution routes through the canonical Gemini runtime when background runtime is unavailable', async () => {
  const chunks: Array<{ text?: string }> = [];
  let runtimeCalls = 0;
  let streamedApiKey = '';

  await executeChatRuntime({
    conversationId: 'conv_1',
    assistantMessageId: 'msg_1',
    message: 'hello',
    history: [],
    systemPrompt: 'system',
    model: 'gemini-test',
    apiKey: 'legacy-test-key',
    runtime: {
      ...createRuntimeMock([{ text: 'hello back' }, { text: 'second' }]),
      async stream(request) {
        runtimeCalls += 1;
        streamedApiKey = request.apiKey;
        request.onChunk({ text: 'hello back' });
        request.onChunk({ text: 'second' });
      },
    },
    background: createBackgroundMock(),
    onChunk: (chunk) => chunks.push(chunk),
  });

  assert.equal(runtimeCalls, 1);
  assert.equal(streamedApiKey, 'legacy-test-key');
  assert.deepEqual(chunks.map((chunk) => chunk.text), ['hello back', 'second']);
});

test('accepted durable execution returns its completed result without starting a second Gemini stream', async () => {
  let runtimeCalls = 0;
  const chunks: Array<{ text?: string }> = [];
  let removedJob: string | null = null;

  const background = createBackgroundMock({
    isEnabled: () => true,
    isConfigured: () => true,
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

test('foreground execution forwards canonical Gemini stream chunks to the chat callback', async () => {
  const chunks: Array<{ text?: string }> = [];

  await executeChatRuntime({
    conversationId: 'conv_1',
    assistantMessageId: 'msg_1',
    message: 'hello',
    history: [],
    systemPrompt: 'system',
    model: 'gemini-test',
    apiKey: 'foreground-key',
    runtime: createRuntimeMock([{ text: 'first' }, { text: 'second' }, {}]),
    background: createBackgroundMock(),
    onChunk: (chunk) => chunks.push(chunk),
  });

  assert.deepEqual(chunks.map((chunk) => chunk.text), ['first', 'second', undefined]);
});
