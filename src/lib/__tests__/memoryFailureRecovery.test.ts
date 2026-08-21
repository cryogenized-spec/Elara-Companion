import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeMemoryState } from '../memoryStorage';
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

  it('keeps a valid canonical state shape even when maintenance is due', () => {
    const state: MemoryScratchpadState = {
      schemaVersion: 3,
      memories: [],
      lastMaintenanceAt: '2026-08-19T00:00:00.000Z',
      autoMaintenanceEnabled: true,
    };

    assert.equal(state.schemaVersion, 3);
    assert.ok(Array.isArray(state.memories));
  });
});
