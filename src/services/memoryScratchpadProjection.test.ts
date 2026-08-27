import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPersistentScratchpad } from './memoryScratchpadProjection';

test('buildPersistentScratchpad produces a bounded importance-ranked projection', () => {
  const memories = Array.from({ length: 45 }, (_, index) => ({
    id: `mem-${index}`,
    content: `memory ${index}`,
    kind: index === 0 ? 'observation' : 'episode',
    lifecycle: 'persistent',
    source: 'elara',
    confidence: 'certain',
    importance: index < 2 ? 'core' : index < 4 ? 'important' : 'normal',
    isPrivate: index % 2 === 0,
    category: index % 2 === 0 ? 'Preferences' : 'Observations',
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    pinned: false,
    tags: [],
    evidenceCount: 1,
    evidenceMemoryIds: [],
    conflictMemoryIds: [],
    relatedMemoryIds: [],
    retrievalCount: 0,
    state: 'active',
    resolution: 'contextual',
    lastObservedAt: '2026-08-27T00:00:00.000Z',
  })) as any;

  const projection = buildPersistentScratchpad(memories);
  const lines = projection.split('\n');

  assert.equal(lines.length, 40);
  assert.match(lines[0], /\[core\].*memory 0|\[core\].*memory 1/);
  assert.match(lines[0], /PRIVATE OBSERVATION|SHARED FACT/);
});
