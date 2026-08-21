import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemoryItem } from '../../types';
import { consolidateMemories, getConsolidationCandidateStats, semanticMemorySimilarity } from '../memoryConsolidation';

const observation = (id: string, content: string, overrides: Partial<MemoryItem> = {}): MemoryItem => ({
  id,
  content,
  kind: 'observation',
  lifecycle: 'persistent',
  source: 'conversation',
  confidence: 'likely',
  importance: 'normal',
  isPrivate: true,
  category: 'Observations',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  resolution: 'observation',
  state: 'active',
  ...overrides,
});

describe('memory consolidation', () => {
  it('calculates high similarity for near-identical observations', () => {
    const score = semanticMemorySimilarity(
      observation('a', 'User prefers coffee in the morning.'),
      observation('b', 'User prefers coffee in the morning!'),
    );
    assert.ok(score >= 0.82);
  });

  it('reinforces duplicate observations without deleting them', () => {
    const result = consolidateMemories([
      observation('a', 'User prefers coffee in the morning.'),
      observation('b', 'User prefers coffee in the morning!'),
    ]);

    assert.equal(result.memories.length, 2);
    assert.ok(result.candidates.some((candidate) => candidate.kind === 'duplicate'));
    assert.ok((result.memories[0].reinforcementCount || 0) > 0 || (result.memories[1].reinforcementCount || 0) > 0);
  });

  it('marks related contradictory observations as conflicted', () => {
    const result = consolidateMemories([
      observation('a', 'User prefers coffee.'),
      observation('b', 'User avoids coffee.'),
    ]);

    assert.equal(result.memories[0].state, 'conflicted');
    assert.equal(result.memories[1].state, 'conflicted');
    assert.ok(result.candidates.some((candidate) => candidate.kind === 'conflict'));
  });

  it('promotes an observation only after repeated evidence', () => {
    const result = consolidateMemories([
      observation('a', 'User prefers coffee.', { kind: 'preference', reinforcementCount: 3, evidenceCount: 3 }),
    ]);

    assert.equal(result.memories[0].resolution, 'core');
    assert.ok(result.candidates.some((candidate) => candidate.kind === 'promote'));
  });

  it('prunes impossible pairwise comparisons for disjoint memory vocabularies', () => {
    const memories = Array.from({ length: 1000 }, (_, index) => observation(`m-${index}`, `topic${index} detail${index}`));
    const stats = getConsolidationCandidateStats(memories);
    assert.equal(stats.activeMemoryCount, 1000);
    assert.equal(stats.theoreticalPairCount, 499500);
    assert.equal(stats.candidatePairCount, 0);
  });

  it('preserves duplicate/conflict detection after candidate indexing', () => {
    const memories = [
      observation('dup-a', 'User prefers coffee in the morning.'),
      observation('dup-b', 'User prefers coffee in the morning!'),
      observation('conflict-a', 'User prefers tea.'),
      observation('conflict-b', 'User avoids tea.'),
      observation('unrelated', 'User likes astronomy and telescopes.'),
    ];
    const result = consolidateMemories(memories);
    assert.ok(result.candidates.some((candidate) => candidate.kind === 'duplicate' && candidate.sourceId === 'dup-a' && candidate.targetId === 'dup-b'));
    assert.ok(result.candidates.some((candidate) => candidate.kind === 'conflict' && candidate.sourceId === 'conflict-a' && candidate.targetId === 'conflict-b'));
    assert.equal(result.memories.find((memory) => memory.id === 'unrelated')?.state, 'active');
  });
});
