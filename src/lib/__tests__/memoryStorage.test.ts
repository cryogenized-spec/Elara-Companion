import { describe, expect, it } from 'vitest';
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

    expect(memory).not.toBeNull();
    expect(memory?.kind).toBe('preference');
    expect(memory?.lifecycle).toBe('persistent');
    expect(memory?.source).toBe('system');
    expect(memory?.tags).toEqual([]);
    expect(memory?.relatedMemoryIds).toEqual([]);
    expect(memory?.links).toEqual([]);
    expect(memory?.reinforcementCount).toBe(0);
    expect(memory?.pinned).toBe(false);
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

    expect(memory?.kind).toBe('episode');
    expect(memory?.lifecycle).toBe('contextual');
    expect(memory?.source).toBe('conversation');
    expect(memory?.links).toEqual([{ type: 'artifact', id: 'art-1', label: 'Canvas' }]);
    expect(memory?.reinforcementCount).toBe(3);
    expect(memory?.pinned).toBe(true);
  });

  it('returns a versioned state and filters malformed memory entries', () => {
    const state = normalizeMemoryState({
      memories: [
        { id: 'valid', content: 'Keep this.', confidence: 'certain', importance: 'normal', isPrivate: true, category: 'User', createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z' },
        { id: 'broken', content: 42 },
      ],
      autoMaintenanceEnabled: false,
    });

    expect(state.schemaVersion).toBe(2);
    expect(state.autoMaintenanceEnabled).toBe(false);
    expect(state.memories).toHaveLength(1);
    expect(state.memories[0].id).toBe('valid');
  });
});
