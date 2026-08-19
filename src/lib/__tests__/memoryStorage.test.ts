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
    assert.deepEqual(memory.tags, []);
    assert.deepEqual(memory.relatedMemoryIds, []);
    assert.deepEqual(memory.links, []);
    assert.equal(memory.reinforcementCount, 0);
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
      sourceConversationId: 'conv-1',
      links: [{ type: 'artifact', id: 'art-1', label: 'Canvas' }],
      reinforcementCount: 3,
      pinned: true,
    });

    assert.ok(memory);
    assert.equal(memory.kind, 'episode');
    assert.equal(memory.lifecycle, 'contextual');
    assert.equal(memory.source, 'conversation');
    assert.deepEqual(memory.links, [{ type: 'artifact', id: 'art-1', label: 'Canvas' }]);
    assert.equal(memory.reinforcementCount, 3);
    assert.equal(memory.pinned, true);
  });

  it('returns a versioned state and filters malformed memory entries', () => {
    const state = normalizeMemoryState({
      memories: [
        { id: 'valid', content: 'Keep this.', confidence: 'certain', importance: 'normal', isPrivate: true, category: 'User', createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' },
        { id: 'broken', content: 42 },
      ],
      autoMaintenanceEnabled: false,
    });

    assert.equal(state.schemaVersion, 2);
    assert.equal(state.autoMaintenanceEnabled, false);
    assert.equal(state.memories.length, 1);
    assert.equal(state.memories[0].id, 'valid');
  });
});
