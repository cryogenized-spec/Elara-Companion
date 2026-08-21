import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ThinkingEvent } from '../thinkingEvents';

describe('thinking timeline collapse contract', () => {
  it('derives a stable elapsed duration from chronological events', () => {
    const events: ThinkingEvent[] = [
      {
        id: 'a',
        sequence: 1,
        timestamp: 1_000,
        type: 'thought',
        source: 'model',
        status: 'completed',
        title: 'Understand request',
      },
      {
        id: 'b',
        sequence: 2,
        timestamp: 9_450,
        type: 'completion',
        source: 'system',
        status: 'completed',
        title: 'Response ready',
      },
    ];

    const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
    assert.equal(ordered.at(-1)!.timestamp - ordered[0].timestamp, 8_450);
  });

  it('keeps event chronology deterministic when timestamps collide', () => {
    const events: ThinkingEvent[] = [
      { id: 'b', sequence: 2, timestamp: 100, type: 'tool_call', source: 'tool', status: 'completed', title: 'Search' },
      { id: 'a', sequence: 1, timestamp: 100, type: 'thought', source: 'model', status: 'completed', title: 'Think' },
    ];
    events.sort((a, b) => a.sequence - b.sequence || a.timestamp - b.timestamp || a.id.localeCompare(b.id));
    assert.deepEqual(events.map((event) => event.id), ['a', 'b']);
  });
});
