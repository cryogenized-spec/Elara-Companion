import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  beginLiveThinkingStream,
  clearLiveThinkingStream,
  getLiveThinkingEvents,
  recordLiveMemoryActivity,
  recordLiveToolActivity,
} from '../thinkingLiveRuntime';

describe('thinking tool and memory event bridge', () => {
  it('records a tool call and result with service metadata', () => {
    beginLiveThinkingStream();

    const events = recordLiveToolActivity({
      name: 'google_calendar_list_events',
      operation: 'list_events',
      result: '2 events found',
    });

    assert.equal(events.length, 2);
    assert.equal(events[0].type, 'tool_call');
    assert.equal(events[0].tool?.service, 'google_calendar');
    assert.equal(events[1].type, 'tool_result');
    assert.equal(events[1].relatedEventId, events[0].id);
    assert.equal(events[1].summary, '2 events found');
  });

  it('records memory mutations as memory-specific events', () => {
    beginLiveThinkingStream();

    const events = recordLiveMemoryActivity({
      type: 'UPDATE',
      targetId: 'mem_123',
      reason: 'Refined with newer evidence.',
    });

    assert.equal(events.at(-2)?.type, 'memory');
    assert.equal(events.at(-2)?.source, 'memory');
    assert.equal(events.at(-1)?.type, 'memory_result');
    assert.equal(events.at(-1)?.source, 'memory');
    assert.equal(events.at(-1)?.summary, 'Refined with newer evidence.');
    assert.deepEqual(getLiveThinkingEvents().map((event) => event.sequence), [1, 2]);

    clearLiveThinkingStream();
  });
});
