import assert from 'node:assert/strict';
import test from 'node:test';
import { executeBackgroundChatJob } from '../chatBackgroundService';
import type { BackgroundRuntimeContract } from '../../contracts';

test('background Chat boundary persists, waits, publishes, and removes an accepted job', async () => {
  const calls: string[] = [];
  const chunks: unknown[] = [];

  const background: Pick<BackgroundRuntimeContract, 'createChatJob' | 'persistJob' | 'waitForJob' | 'removeJob'> = {
    async createChatJob(request) {
      calls.push(`create:${request.message}`);
      return { id: 'job-42' };
    },
    persistJob(job) {
      calls.push(`persist:${job.jobId}`);
    },
    async waitForJob(jobId) {
      calls.push(`wait:${jobId}`);
      return {
        id: jobId,
        status: 'completed',
        output: { result: { text: 'durable answer', createdArtifactIds: ['artifact-1'] } },
      };
    },
    removeJob(jobId) {
      calls.push(`remove:${jobId}`);
    },
  };

  const result = await executeBackgroundChatJob({
    conversationId: 'conv-1',
    assistantMessageId: 'msg-1',
    request: { message: 'hello', systemPrompt: 'system' },
    background,
    onChunk: (chunk) => chunks.push(chunk),
  });

  assert.deepEqual(result, { durable: true });
  assert.deepEqual(calls, ['create:hello', 'persist:job-42', 'wait:job-42', 'remove:job-42']);
  assert.deepEqual(chunks, [{
    text: 'durable answer',
    finishReason: undefined,
    workspace: undefined,
    artifactIds: ['artifact-1'],
  }]);
});

test('background Chat boundary never removes or publishes success after a failed terminal job', async () => {
  let removed = false;
  const background: Pick<BackgroundRuntimeContract, 'createChatJob' | 'persistJob' | 'waitForJob' | 'removeJob'> = {
    async createChatJob() { return { id: 'job-failed' }; },
    persistJob() {},
    async waitForJob() { return { id: 'job-failed', status: 'failed', error: 'boom' }; },
    removeJob() { removed = true; },
  };

  await assert.rejects(
    executeBackgroundChatJob({
      conversationId: 'conv-1',
      assistantMessageId: 'msg-1',
      request: { message: 'hello', systemPrompt: 'system' },
      background,
      onChunk: () => assert.fail('failed jobs must not emit a completion chunk'),
    }),
    /boom/,
  );

  assert.equal(removed, false);
});
