import { describe, expect, it } from 'vitest';
import { clearApplicationCommandHandlers, dispatchApplicationCommand, registerApplicationCommand } from '../applicationCommands';
import { clearApplicationEventHandlers, publishApplicationEvent, subscribeApplicationEvent } from '../applicationEventBus';

describe('application event and command boundaries', () => {
  it('delivers typed events and supports unsubscribe without leaking listeners', () => {
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

    expect(received).toEqual(['job-1']);
  });

  it('isolates handler failures so one subscriber cannot stop the others', () => {
    clearApplicationEventHandlers();
    const received: string[] = [];

    subscribeApplicationEvent('artifact.changed', () => {
      throw new Error('intentional test failure');
    });
    subscribeApplicationEvent('artifact.changed', (event) => {
      received.push(event.payload.artifact.id);
    });

    expect(() => publishApplicationEvent({
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
    })).not.toThrow();
    expect(received).toEqual(['artifact-1']);
  });

  it('dispatches typed commands through registered handlers', async () => {
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
    expect(received).toEqual(['job-7']);
    await expect(dispatchApplicationCommand({
      type: 'background.complete',
      payload: { jobId: 'job-8' },
    })).rejects.toThrow('No handler registered');
  });
});
