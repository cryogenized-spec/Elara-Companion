import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createThinkingEvent,
  orderThinkingEvents,
  type ThinkingEvent,
} from '../thinkingEvents';

describe('thinking event architecture', () => {
  it('creates canonical events with stable ordering metadata', () => {
    const event = createThinkingEvent(
      {
        type: 'tool_call',
        source: 'tool',
        title: 'Checking calendar',
        summary: 'Looking for relevant upcoming events.',
        tool: {
          name: 'google_calendar_list_events',
          service: 'google_calendar',
          operation: 'list_events',
        },
      },
      1700000000000,
    );

    assert.equal(event.type, 'tool_call');
    assert.equal(event.source, 'tool');
    assert.equal(event.status, 'active');
    assert.equal(event.timestamp, 1700000000000);
    assert.equal(event.tool?.service, 'google_calendar');
    assert.match(event.id, /^thinking_1700000000000_/);
    assert.equal(event.title, 'Checking calendar');
  });

  it('orders the complete stream by sequence before timestamp', () => {
    const events: ThinkingEvent[] = [
      {
        id: 'late', sequence: 3, timestamp: 100, type: 'completion', source: 'model', status: 'completed', title: 'Done',
      },
      {
        id: 'first', sequence: 1, timestamp: 900, type: 'thought', source: 'model', status: 'completed', title: 'Understand',
      },
      {
        id: 'second', sequence: 2, timestamp: 800, type: 'memory', source: 'memory', status: 'completed', title: 'Recall context',
      },
    ];

    assert.deepEqual(orderThinkingEvents(events).map((event) => event.id), ['first', 'second', 'late']);
  });

  it('does not expose invalid negative durations', () => {
    const event = createThinkingEvent(
      { type: 'tool_result', title: 'Calendar complete', durationMs: -250 },
      1700000000000,
    );

    assert.equal(event.durationMs, 0);
  });
});
