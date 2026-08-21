import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeMemoryItem, normalizeMemoryState } from '../memoryStorage';

describe('memory scratchpad normalization', () => {
  it('normalizes legacy confidence and importance values into the canonical taxonomy', () => {
    const memory = normalizeMemoryItem({
      id: 'legacy-1',
      content: 'Legacy memory',
      confidence: 'medium',
      importance: 'high',
      isPrivate: true,
      category: 'Observations',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    });

    assert.deepEqual(
      {
        confidence: memory?.confidence,
        importance: memory?.importance,
        kind: memory?.kind,
        lifecycle: memory?.lifecycle,
        source: memory?.source,
      },
      {
        confidence: 'likely',
        importance: 'important',
        kind: 'observation',
        lifecycle: 'persistent',
        source: 'system',
      },
    );
  });

  it('drops malformed records while returning a safe state', () => {
    const state = normalizeMemoryState({
      memories: [
        null,
        { id: 'bad', content: 'Missing required metadata' },
        {
          id: 'good',
          content: 'Safe memory',
          confidence: 'certain',
          importance: 'normal',
          isPrivate: true,
          category: 'User',
          createdAt: '2026-08-20T00:00:00.000Z',
          updatedAt: '2026-08-20T00:00:00.000Z',
        },
      ],
    });

    assert.equal(state.memories.length, 1);
    assert.equal(state.memories[0].id, 'good');
  });
});
