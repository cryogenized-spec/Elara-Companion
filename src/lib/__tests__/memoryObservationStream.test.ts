import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemoryScratchpadState } from '../../types';
import { applyMemoryActions } from '../memoryProcessor';

const baseState: MemoryScratchpadState = { memories: [], autoMaintenanceEnabled: true, schemaVersion: 3 };

describe('memory observation stream', () => {
  it('stores created observations with active observation metadata and provenance', () => {
    const next = applyMemoryActions(baseState, [{
      type: 'CREATE',
      memory: {
        content: 'Gareth mentioned he is painting the roof this week.',
        kind: 'observation',
        lifecycle: 'contextual',
        source: 'conversation',
        resolution: 'observation',
        state: 'active',
        confidence: 'certain',
        importance: 'normal',
        isPrivate: true,
        category: 'Observations',
      },
    }], 'conv-roof');

    const memory = next.memories[0];
    assert.equal(memory.resolution, 'observation');
    assert.equal(memory.state, 'active');
    assert.equal(memory.sourceConversationId, 'conv-roof');
    assert.equal(memory.evidenceCount, 1);
    assert.deepEqual(memory.evidenceMemoryIds, []);
    assert.equal(memory.retrievalCount, 0);
    assert.ok(memory.lastObservedAt);
  });

  it('does not promote an observation when the action omits advanced metadata', () => {
    const next = applyMemoryActions(baseState, [{
      type: 'CREATE',
      memory: {
        content: 'User mentioned a new local shop.',
        kind: 'observation',
        lifecycle: 'contextual',
        confidence: 'likely',
        importance: 'low',
        isPrivate: true,
        category: 'Places',
      },
    }]);

    assert.equal(next.memories[0].resolution, 'observation');
    assert.equal(next.memories[0].state, 'active');
    assert.equal(next.memories[0].lifecycle, 'contextual');
    assert.equal(next.memories[0].importance, 'low');
  });
});
