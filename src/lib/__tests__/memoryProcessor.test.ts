import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyMemoryActions } from '../memoryProcessor';
import { MemoryScratchpadState } from '../../types';

describe('rich memory action processing', () => {
  it('preserves natural-memory taxonomy and links when creating a note', () => {
    const state: MemoryScratchpadState = {
      memories: [],
      autoMaintenanceEnabled: true,
      schemaVersion: 2,
    };

    const next = applyMemoryActions(state, [{
      type: 'CREATE',
      memory: {
        content: "I've noticed Gareth prefers tangible progress early in a project.",
        kind: 'preference',
        lifecycle: 'persistent',
        source: 'conversation',
        confidence: 'likely',
        importance: 'important',
        isPrivate: true,
        category: 'Preferences',
        tags: ['workflow'],
        relatedMemoryIds: [],
        links: [{ type: 'conversation', id: 'conv-1', label: 'Current conversation' }],
      },
    }], 'conv-1');

    assert.equal(next.memories.length, 1);
    assert.equal(next.memories[0].kind, 'preference');
    assert.equal(next.memories[0].lifecycle, 'persistent');
    assert.equal(next.memories[0].source, 'conversation');
    assert.equal(next.memories[0].confidence, 'likely');
    assert.deepEqual(next.memories[0].links, [{ type: 'conversation', id: 'conv-1', label: 'Current conversation' }]);
    assert.equal(next.schemaVersion, 2);
  });
});
