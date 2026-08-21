import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeMemoryState } from '../memoryStorage';
import { runMemoryMaintenanceCycle } from '../memoryMaintenanceScheduler';
import type { MemoryScratchpadState } from '../../types';

describe('memory failure recovery', () => {
  it('drops malformed records while preserving valid memories', () => {
    const state = normalizeMemoryState({
      schemaVersion: 3,
      memories: [
        {
          id: 'valid',
          content: 'User prefers concise explanations.',
          kind: 'preference',
          lifecycle: 'persistent',
          source: 'conversation',
          confidence: 'likely',
          importance: 'normal',
          isPrivate: true,
          category: 'Preferences',
          createdAt: '2026-08-20T00:00:00.000Z',
          updatedAt: '2026-08-20T00:00:00.000Z',
        },
        { id: 'missing-content', kind: 'observation', isPrivate: true },
        { id: 'missing-privacy', content: 'Broken memory', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z' },
        null,
        'not-an-object',
      ],
    });

    assert.equal(state.memories.length, 1);
    assert.equal(state.memories[0].id, 'valid');
    assert.equal(state.schemaVersion, 3);
  });

  it('keeps the canonical state intact when maintenance runs on an empty store', () => {
    const state: MemoryScratchpadState = {
      schemaVersion: 3,
      memories: [],
      lastMaintenanceAt: '2026-08-19T00:00:00.000Z',
      autoMaintenanceEnabled: true,
    };
    const cycle = runMemoryMaintenanceCycle(state, {
      now: new Date('2026-08-21T00:00:00.000Z'),
      intervalMs: 0,
    });

    assert.equal(cycle.ran, true);
    assert.equal(cycle.state.schemaVersion, 3);
    assert.ok(Array.isArray(cycle.state.memories));
  });
});
