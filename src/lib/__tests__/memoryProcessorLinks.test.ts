import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemoryScratchpadState } from '../../types';
import { applyMemoryActions } from '../memoryProcessor';

const baseState: MemoryScratchpadState = { memories: [], autoMaintenanceEnabled: true, schemaVersion: 3 };

describe('memory provenance links', () => {
  it('links created memories to their source conversation', () => {
    const next = applyMemoryActions(baseState, [{
      type: 'CREATE',
      memory: {
        content: 'A useful observation.',
        confidence: 'certain',
        importance: 'normal',
        isPrivate: true,
        category: 'Observations',
      },
    }], 'conv-123');

    assert.deepEqual(next.memories[0].links, [
      { type: 'conversation', id: 'conv-123', label: 'Source conversation' },
    ]);
  });

  it('deduplicates explicit artifact and conversation links', () => {
    const next = applyMemoryActions(baseState, [{
      type: 'CREATE',
      memory: {
        content: 'Project artifact.',
        confidence: 'certain',
        importance: 'important',
        isPrivate: true,
        category: 'Projects',
        sourceArtifactId: 'artifact-456',
        links: [
          { type: 'conversation', id: 'conv-123' },
          { type: 'artifact', id: 'artifact-456' },
          { type: 'artifact', id: 'artifact-456', label: 'Duplicate' },
        ],
      },
    }], 'conv-123');

    assert.deepEqual(next.memories[0].links, [
      { type: 'conversation', id: 'conv-123' },
      { type: 'artifact', id: 'artifact-456' },
    ]);
  });

  it('preserves provenance when memories are merged', () => {
    const state: MemoryScratchpadState = {
      ...baseState,
      memories: [
        {
          id: 'a', content: 'Older note.', kind: 'project', lifecycle: 'persistent', source: 'conversation',
          confidence: 'certain', importance: 'normal', isPrivate: true, category: 'Projects',
          createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z',
          sourceConversationId: 'conv-old', sourceArtifactId: 'artifact-old',
          links: [{ type: 'artifact', id: 'artifact-old' }], relatedMemoryIds: ['b'], resolution: 'contextual', state: 'active',
          evidenceCount: 1, evidenceMemoryIds: [],
        },
        {
          id: 'b', content: 'Related note.', kind: 'project', lifecycle: 'persistent', source: 'conversation',
          confidence: 'certain', importance: 'normal', isPrivate: true, category: 'Projects',
          createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z',
          sourceConversationId: 'conv-old', relatedMemoryIds: ['a'], resolution: 'contextual', state: 'active',
          evidenceCount: 1, evidenceMemoryIds: [],
        },
      ],
    };

    const next = applyMemoryActions(state, [{
      type: 'MERGE',
      mergeTargetIds: ['a', 'b'],
      memory: {
        content: 'Consolidated note.',
        confidence: 'certain',
        importance: 'important',
        isPrivate: true,
        category: 'Projects',
      },
    }], 'conv-new');

    const merged = next.memories.find((memory) => memory.resolution === 'synthesized');
    const sourceA = next.memories.find((memory) => memory.id === 'a');
    const sourceB = next.memories.find((memory) => memory.id === 'b');

    assert.ok(merged);
    assert.equal(merged.sourceConversationId, 'conv-new');
    assert.equal(merged.sourceArtifactId, 'artifact-old');
    assert.equal(sourceA?.state, 'superseded');
    assert.equal(sourceA?.supersededByMemoryId, merged.id);
    assert.equal(sourceB?.state, 'superseded');
    assert.equal(sourceB?.supersededByMemoryId, merged.id);
    assert.ok(merged.evidenceMemoryIds?.includes('a'));
    assert.ok(merged.evidenceMemoryIds?.includes('b'));
    assert.ok(merged.relatedMemoryIds?.includes('a'));
    assert.ok(merged.relatedMemoryIds?.includes('b'));
  });
});
