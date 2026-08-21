import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemoryItem, MemoryScratchpadState } from '../../types';
import { explainMemoryState, summarizeMemoryState } from '../memoryTransparency';

const memory = (overrides: Partial<MemoryItem> = {}): MemoryItem => ({
  id: 'mem-1',
  content: 'Workshop plan.',
  kind: 'project',
  lifecycle: 'persistent',
  resolution: 'contextual',
  state: 'active',
  source: 'conversation',
  confidence: 'likely',
  importance: 'normal',
  isPrivate: true,
  category: 'Projects',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  reinforcementCount: 2,
  evidenceCount: 3,
  evidenceMemoryIds: ['e-1', 'e-2', 'e-3'],
  pinned: false,
  ...overrides,
});

const state = (...memories: MemoryItem[]): MemoryScratchpadState => ({
  memories,
  autoMaintenanceEnabled: true,
  lastMaintenanceAt: '2026-08-21T08:00:00.000Z',
  schemaVersion: 3,
});

describe('memory transparency', () => {
  it('summarizes lifecycle, protection, privacy, and evidence counts without changing state', () => {
    const input = state(
      memory(),
      memory({ id: 'stale', state: 'stale', isPrivate: false, pinned: true, importance: 'important' }),
      memory({ id: 'archived', state: 'archived', lifecycle: 'archived', evidenceCount: 0, evidenceMemoryIds: [] }),
      memory({ id: 'conflicted', state: 'conflicted', importance: 'core', lifecycle: 'core' }),
      memory({ id: 'superseded', state: 'superseded', isPrivate: false }),
    );

    const summary = summarizeMemoryState(input);

    assert.equal(summary.schemaVersion, 3);
    assert.equal(summary.total, 5);
    assert.equal(summary.active, 1);
    assert.equal(summary.stale, 1);
    assert.equal(summary.archived, 1);
    assert.equal(summary.conflicted, 1);
    assert.equal(summary.superseded, 1);
    assert.equal(summary.pinned, 1);
    assert.equal(summary.core, 1);
    assert.equal(summary.privateCount, 3);
    assert.equal(summary.withEvidence, 4);
    assert.equal(summary.evidenceTotal, 12);
    assert.equal(summary.lastMaintenanceAt, '2026-08-21T08:00:00.000Z');
    assert.equal(input.memories[1].state, 'stale');
  });

  it('treats archived lifecycle as archived even when state is absent', () => {
    const summary = summarizeMemoryState(state(memory({ lifecycle: 'archived', state: undefined })));
    assert.equal(summary.archived, 1);
    assert.equal(summary.active, 0);
  });

  it('provides stable explanations for lifecycle states', () => {
    assert.match(explainMemoryState('active'), /Eligible for normal retrieval/);
    assert.match(explainMemoryState('stale'), /Retained as evidence/);
    assert.match(explainMemoryState('archived'), /excluded from normal retrieval/);
    assert.match(explainMemoryState('conflicted'), /Conflicting evidence/);
    assert.match(explainMemoryState('superseded'), /newer or more accurate memory/);
  });
});
