import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemoryScratchpadState } from '../../types';
import { applyMemoryActions } from '../memoryProcessor';

const baseState: MemoryScratchpadState = {
  memories: [],
  autoMaintenanceEnabled: true,
  schemaVersion: 2,
};

describe('memory provenance links', () => {
  it('links newly created memories to their source conversation', () => {
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
    assert.equal(next.memories[0].sourceConversationId, 'conv-123');
  });

  it('normalizes an explicit artifact provenance link and preserves conversation provenance', () => {
    const next = applyMemoryActions(baseState, [{
      type: 'CREATE',
      memory: {
        content: 'Elara created a project artifact.',
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
    assert.equal(next.memories[0].sourceArtifactId, 'artifact-456');
  });

  it('carries provenance through a merge without dropping related links', () => {
    const state: MemoryScratchpadState = {
      ...baseState,
      memories: [
        {
          id: 'a',
          content: 'Older project note.',
          kind: 'project',
          lifecycle: 'persistent',
          source: 'conversation',
          confidence: 'certain',
          importance: 'normal',
          isPrivate: true,
          category: 'Projects',
          createdAt: '2026-08-19T00:00:00.000Z',
          updatedAt: '2026-08-19T00:00:00.000Z',
          sourceConversationId: 'conv-old',
          sourceArtifactId: 'artifact-old',
          relatedMemoryIds: ['b'],
          links: [{ type: 'artifact', id: 'artifact-old' }],
        },
        {
          id: 'b',
          content: 'Related project note.',
          kind: 'project',
          lifecycle: 'persistent',
          source: 'conversation',
          confidence: 'certain',
          importance: 'normal',
          isPrivate: true,
          category: 'Projects',
          createdAt: '2026-08-19T00:00:00.000Z',
          updatedAt: '2026-08-19T00:00:00.000Z',
          sourceConversationId: 'conv-old',
          relatedMemoryIds: ['a'],
        },
      ],
    };

    const next = applyMemoryActions(state, [{
      type: 'MERGE',
      mergeTargetIds: ['a', 'b'],
      memory: {
        content: 'Consolidated project note.',
        confidence: 'certain',
        importance: 'important',
        isPrivate: true,
        category: 'Projects',
      },
    }], 'conv-new');

    assert.equal(next.memories.length, 1);
    assert.equal(next.memories[0].sourceConversationId, 'conv-new');
    assert.equal(next.memories[0].sourceArtifactId, 'artifact-old');
    assert.deepEqual(next.memories[0].links, [
      { type: 'artifact', id: 'artifact-old' },
      { type: 'conversation', id: 'conv-new', label: 'Source conversation' },
    ]);
  });
});
