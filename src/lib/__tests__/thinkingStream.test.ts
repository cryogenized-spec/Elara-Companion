import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  completeThinkingStream,
  createThinkingStreamBuffer,
  pushThought,
  pushToolActivity,
  snapshotThinkingStream,
} from '../thinkingStream';

describe('chronological thinking stream', () => {
  it('updates one live thought instead of creating one event per chunk', () => {
    const stream = createThinkingStreamBuffer();
    const first = pushThought(stream, 'Thinking', 'Checking the request.', 1000);
    const second = pushThought(stream, 'Thinking', 'Checking the request and recent context.', 1100);

    assert.equal(first.id, second.id);
    assert.equal(stream.events.length, 1);
    assert.equal(stream.events[0].timestamp, 1000);
    assert.equal(stream.events[0].summary, 'Checking the request and recent context.');
  });

  it('keeps tool call and result events in stream order', () => {
    const stream = createThinkingStreamBuffer();
    pushThought(stream, 'Thinking', 'Checking available context.', 1000);
    pushToolActivity(stream, {
      name: 'google_calendar_list_events',
      result: '2 events found.',
    }, 2000);

    const events = snapshotThinkingStream(stream);
    assert.deepEqual(events.map((event) => event.type), ['thought', 'tool_call', 'tool_result']);
    assert.equal(events[1].tool?.service, 'google_calendar');
    assert.equal(events[2].relatedEventId, events[1].id);
  });

  it('creates a completion event and closes active events', () => {
    const stream = createThinkingStreamBuffer();
    pushThought(stream, 'Thinking', 'Finalising the response.', 1000);
    completeThinkingStream(stream, 3200, 4200);

    const events = snapshotThinkingStream(stream);
    assert.equal(events[0].status, 'completed');
    assert.equal(events.at(-1)?.type, 'completion');
    assert.equal(events.at(-1)?.durationMs, 3200);
  });
});
