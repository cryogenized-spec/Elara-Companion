import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeMemoryItem, normalizeMemoryState } from '../memoryStorage';

describe('memory schema normalization', () => {
  it('upgrades a legacy memory with canonical defaults', () => {
    const memory = normalizeMemoryItem({
      id: 'mem-1',
      content: 'Gareth prefers tangible output early in a project.',
      confidence: 'likely',
      importance: 'important',
      isPrivate: true,
      category: 'Preferences',
      createdAt: '2026-08-19T00:00:00.000Z',
      updatedAt: '2026-08-19T00:00:00.000Z',
    });

    assert.ok(memory);
    assert.equal(memory.kind, 'preference');
    assert.equal(memory.lifecycle, 'persistent');
    assert.equal(memory.source, 'system');
    assert.equal(memory.resolution, 'contextual');
    assert.equal(memory.state, 'active');
    assert.deepEqual(memory.tags, []);
    assert.deepEqual(memory.relatedMemoryIds, []);
    assert.deepEqual(memory.links, []);
    assert.deepEqual(memory.evidenceMemoryIds, []);
    assert.deepEqual(memory.conflictMemoryIds, []);
    assert.equal(memory.reinforcementCount, 0);
    assert.equal(memory.retrievalCount, 0);
    assert.equal(memory.evidenceCount, 0);
    assert.equal(memory.pinned, false);
  });

  it('preserves explicit canonical metadata', () => {
    const memory = normalizeMemoryItem({
      id: 'mem-2',
      content: 'We completed the Canvas overhaul.',
      kind: 'episode',
      lifecycle: 'contextual',
      source: 'conversation',
      confidence: 'certain',
      importance: 'important',
      isPrivate: false,
      category: 'Experiences',
      createdAt: '2026-08-19T00:00:00.000Z',
      updatedAt: '2026-08-19T00:00:00.000Z',
      resolution: 'episodic',
      state: 'active',
      sourceConversationId: 'conv-1',
      evidenceMemoryIds: ['mem-a', 'mem-b'],
      conflictMemoryIds: ['mem-c'],
      retrievalCount: 4,
      evidenceCount: 2,
      links: [{ type: 'artifact', id: 'art-1', label: 'Canvas' }],
      reinforcementCount: 3,
      pinned: true,
    });

    assert.ok(memory);
    assert.equal(memory.kind, 'episode');
    assert.equal(memory.lifecycle, 'contextual');
    assert.equal(memory.source, 'conversation');
    assert.equal(memory.resolution, 'episodic');
    assert.equal(memory.state, 'active');
    assert.deepEqual(memory.evidenceMemoryIds, ['mem-a', 'mem-b']);
    assert.deepEqual(memory.conflictMemoryIds, ['mem-c']);
    assert.equal(memory.retrievalCount, 4);
    assert.equal(memory.evidenceCount, 2);
    assert.deepEqual(memory.links, [{ type: 'artifact', id: 'art-1', label: 'Canvas' }]);
    assert.equal(memory.reinforcementCount, 3);
    assert.equal(memory.pinned, true);
  });

  it('derives core resolution from core lifecycle', () => {
    const memory = normalizeMemoryItem({
      id: 'mem-core',
      content: 'Stable core preference.',
      kind: 'preference',
      lifecycle: 'core',
      confidence: 'certain',
      importance: 'core',
      isPrivate: false,
      category: 'Preferences',
      createdAt: '2026-08-19T00:00:00.000Z',
      updatedAt: '2026-08-19T00:00:00.000Z',
    });

    assert.ok(memory);
    assert.equal(memory.resolution, 'core');
    assert.equal(memory.state, 'active');
  });

  it('returns a versioned state and filters malformed memory entries', () => {
    const state = normalizeMemoryState({
      memories: [
        { id: 'valid', content: 'Keep this.', confidence: 'certain', importance: 'normal', isPrivate: true, category: 'User', createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' },
        { id: 'broken', content: 42 },
      ],
      autoMaintenanceEnabled: false,
      schemaVersion: 2,
    });

    assert.equal(state.schemaVersion, 3);
    assert.equal(state.autoMaintenanceEnabled, false);
    assert.equal(state.memories.length, 1);
    assert.equal(state.memories[0].id, 'valid');
    assert.equal(state.memories[0].resolution, 'core');
  });
});
