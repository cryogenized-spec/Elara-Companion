import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPersistentScratchpad } from './memoryScratchpadProjection';
import type { MemoryItem } from '../types';

function memory(id: string, importance: MemoryItem['importance'], content: string): MemoryItem {
  const now = '2026-08-27T00:00:00.000Z';
  return {
    id,
    content,
    kind: 'observation',
    lifecycle: 'persistent',
    source: 'test',
    confidence: 'certain',
    importance,
    isPrivate: true,
    category: 'Observations',
    createdAt: now,
    updatedAt: now,
    pinned: false,
    tags: [],
    resolution: 'observation',
    state: 'active',
    lastObservedAt: now,
    retrievalCount: 0,
    evidenceCount: 1,
    evidenceMemoryIds: [],
    conflictMemoryIds: [],
  } as MemoryItem;
}

test('ranks scratchpad entries by importance and caps the projection at forty memories', () => {
  const memories = Array.from({ length: 45 }, (_, index) => memory(`m${index}`, index === 44 ? 'core' : 'normal', `memory ${index}`));
  const projection = buildPersistentScratchpad(memories);
  const lines = projection.split('\n');

  assert.equal(lines.length, 40);
  assert.match(lines[0], /memory 44/);
  assert.equal(lines.filter((line) => /memory 44/.test(line)).length, 1);
});

test('renders privacy, category, kind, and confidence metadata', () => {
  const projection = buildPersistentScratchpad([memory('m1', 'important', 'keep this')]);
  assert.equal(projection, '- [PRIVATE OBSERVATION] [Observations] [observation] [certain] keep this');
});
