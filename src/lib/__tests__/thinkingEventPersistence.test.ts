import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { persistLiveThinkingEvents, flushLiveThinkingEvents } from '../thinkingEventPersistence';

const sampleEvents = [
  {
    id: 'thought_1',
    sequence: 1,
    timestamp: 100,
    type: 'thought' as const,
    source: 'model' as const,
    status: 'completed' as const,
    title: 'Understand request',
    summary: 'Reading the request.',
  },
];

describe('thinking event persistence bridge', () => {
  it('accepts event snapshots and exposes an explicit flush operation', async () => {
    assert.doesNotThrow(() => persistLiveThinkingEvents(sampleEvents));
    await assert.doesNotReject(() => flushLiveThinkingEvents());
  });
});
