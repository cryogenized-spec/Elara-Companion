import assert from 'node:assert/strict';
import test from 'node:test';
import { clearApplicationCommandHandlers, dispatchApplicationCommand, registerApplicationCommand } from '../applicationCommands';
import { clearApplicationEventHandlers, publishApplicationEvent, subscribeApplicationEvent } from '../applicationEventBus';

test('application event and command boundaries: unsubscribe prevents listener leaks', () => {
  clearApplicationEventHandlers();
  const received: string[] = [];

  const unsubscribe = subscribeApplicationEvent('background.job.completed', (event) => {
    received.push(event.payload.jobId);
  });

  publishApplicationEvent({
    type: 'background.job.completed',
    payload: { jobId: 'job-1', status: 'completed' },
  });

  unsubscribe();

  publishApplicationEvent({
    type: 'background.job.completed',
    payload: { jobId: 'job-2', status: 'completed' },
  });

  assert.deepEqual(received, ['job-1']);
});

test('application event bus isolates subscriber failures', () => {
  clearApplicationEventHandlers();
  const received: string[] = [];

  subscribeApplicationEvent('artifact.changed', () => {
    throw new Error('intentional test failure');
  });
  subscribeApplicationEvent('artifact.changed', (event) => {
    received.push(event.payload.artifact.id);
  });

  assert.doesNotThrow(() => publishApplicationEvent({
    type: 'artifact.changed',
    payload: {
      artifact: {
        id: 'artifact-1',
        name: 'Test',
        content: '# Test',
        createdAt: 1,
        updatedAt: 1,
        type: 'markdown',
      },
      action: 'created',
    },
  }));
  assert.deepEqual(received, ['artifact-1']);
});

test('application commands dispatch through registered handlers', async () => {
  clearApplicationCommandHandlers();
  const received: string[] = [];
  const unregister = registerApplicationCommand('background.complete', async (command) => {
    received.push(command.payload.jobId);
  });

  await dispatchApplicationCommand({
    type: 'background.complete',
    payload: { jobId: 'job-7' },
  });

  unregister();
  assert.deepEqual(received, ['job-7']);
  await assert.rejects(
    dispatchApplicationCommand({
      type: 'background.complete',
      payload: { jobId: 'job-8' },
    }),
    /No handler registered/,
  );
});
