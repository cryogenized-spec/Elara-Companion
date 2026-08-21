import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemoryItem, MemoryScratchpadState } from '../../types';
import { applySafeMemoryMaintenance, buildMemoryMaintenancePlan, calculateMemoryMaintenanceScore, memoryFingerprint } from '../memoryMaintenance';

const makeMemory = (overrides: Partial<MemoryItem> = {}): MemoryItem => ({
  id: 'mem-1', content: 'Elara remembers the workshop plan.', kind: 'project', lifecycle: 'persistent', resolution: 'contextual', state: 'active', source: 'conversation',
  confidence: 'certain', importance: 'normal', isPrivate: true, category: 'Projects',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', pinned: false,
  tags: [], reinforcementCount: 0, evidenceCount: 0, evidenceMemoryIds: [], ...overrides,
});

describe('memory maintenance', () => {
  it('normalizes fingerprints for equivalent prose', () => {
    assert.equal(memoryFingerprint(makeMemory({ content: '  Elara remembers THE workshop plan. ' })), memoryFingerprint(makeMemory()));
  });

  it('flags stale records according to lifecycle windows', () => {
    const now = new Date('2026-08-19T00:00:00.000Z');
    const plan = buildMemoryMaintenancePlan([
      makeMemory({ id: 'working', lifecycle: 'working', kind: 'working', resolution: 'contextual', updatedAt: '2026-08-01T00:00:00.000Z' }),
      makeMemory({ id: 'context', lifecycle: 'contextual', updatedAt: '2026-07-01T00:00:00.000Z' }),
      makeMemory({ id: 'fresh', lifecycle: 'persistent', updatedAt: '2026-08-18T00:00:00.000Z' }),
    ], { now });
    assert.deepEqual(plan.staleCandidates.map((item) => item.memoryId).sort(), ['context', 'working']);
    assert.equal(plan.expiredCandidates.length, 0);
  });

  it('protects pinned and core memories from expiry', () => {
    const now = new Date('2026-08-19T00:00:00.000Z');
    const plan = buildMemoryMaintenancePlan([
      makeMemory({ id: 'expired', expiresAt: '2026-08-18T00:00:00.000Z' }),
      makeMemory({ id: 'pinned', expiresAt: '2026-08-18T00:00:00.000Z', pinned: true }),
      makeMemory({ id: 'core', expiresAt: '2026-08-18T00:00:00.000Z', lifecycle: 'core', resolution: 'core', importance: 'core' }),
    ], { now });
    assert.deepEqual(plan.expiredCandidates.map((item) => item.memoryId), ['expired']);
    assert.equal(plan.protectedCount, 2);
  });

  it('reports duplicate candidates without merging them', () => {
    const plan = buildMemoryMaintenancePlan([makeMemory({ id: 'a' }), makeMemory({ id: 'b' })], { now: new Date('2026-08-19T00:00:00.000Z') });
    assert.equal(plan.duplicateGroups.length, 1);
    assert.deepEqual(plan.duplicateGroups[0].memoryIds.sort(), ['a', 'b']);
  });

  it('archives explicit expirations without deleting history', () => {
    const now = new Date('2026-08-19T00:00:00.000Z');
    const state: MemoryScratchpadState = { memories: [makeMemory({ id: 'expired', expiresAt: '2026-08-18T00:00:00.000Z' })], autoMaintenanceEnabled: true, schemaVersion: 3 };
    const next = applySafeMemoryMaintenance(state, buildMemoryMaintenancePlan(state.memories, { now }));
    assert.equal(next.memories[0].lifecycle, 'archived');
    assert.equal(next.memories[0].state, 'archived');
    assert.equal(next.memories.length, 1);
    assert.equal(next.schemaVersion, 3);
  });

  it('marks stale memories without destroying their content or evidence', () => {
    const now = new Date('2026-08-19T00:00:00.000Z');
    const state: MemoryScratchpadState = {
      memories: [makeMemory({ id: 'old', updatedAt: '2026-06-01T00:00:00.000Z', evidenceCount: 8, evidenceMemoryIds: Array.from({ length: 8 }, (_, i) => `e-${i}`) })],
      autoMaintenanceEnabled: true,
      schemaVersion: 3,
    };
    const plan = buildMemoryMaintenancePlan(state.memories, { now });
    const next = applySafeMemoryMaintenance(state, plan, { maxEvidenceMemoryIds: 3 });
    assert.equal(next.memories[0].state, 'stale');
    assert.equal(next.memories[0].content, state.memories[0].content);
    assert.equal(next.memories[0].evidenceCount, 8);
    assert.equal(next.memories[0].evidenceMemoryIds?.length, 3);
  });

  it('reactivates stale state when freshness has returned', () => {
    const now = new Date('2026-08-19T00:00:00.000Z');
    const state: MemoryScratchpadState = {
      memories: [makeMemory({ id: 'recent', state: 'stale', updatedAt: '2026-08-18T00:00:00.000Z' })],
      autoMaintenanceEnabled: true,
      schemaVersion: 3,
    };
    const next = applySafeMemoryMaintenance(state, buildMemoryMaintenancePlan(state.memories, { now }));
    assert.equal(next.memories[0].state, 'active');
  });

  it('rewards reinforcement and importance in the maintenance score', () => {
    const now = new Date('2026-08-19T00:00:00.000Z');
    const weak = calculateMemoryMaintenanceScore(makeMemory({ updatedAt: '2026-06-01T00:00:00.000Z', reinforcementCount: 0 }), now);
    const reinforced = calculateMemoryMaintenanceScore(makeMemory({ updatedAt: '2026-06-01T00:00:00.000Z', reinforcementCount: 5, importance: 'important' }), now);
    assert.ok(reinforced > weak);
  });
});
