import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemoryItem, MemoryScratchpadState } from '../../types';
import {
  MEMORY_MAINTENANCE_INTERVAL_MS,
  runMemoryMaintenanceCycle,
  shouldRunMemoryMaintenance,
} from '../memoryMaintenanceScheduler';

const baseState = (...memories: MemoryItem[]): MemoryScratchpadState => ({
  memories,
  autoMaintenanceEnabled: true,
  lastMaintenanceAt: '2026-08-19T07:00:00.000Z',
  schemaVersion: 2,
});

const memory = (overrides: Partial<MemoryItem> = {}): MemoryItem => ({
  id: 'memory-1',
  content: 'Temporary note.',
  kind: 'context',
  lifecycle: 'contextual',
  source: 'conversation',
  confidence: 'certain',
  importance: 'normal',
  isPrivate: true,
  category: 'Observations',
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
  expiresAt: '2026-08-19T06:00:00.000Z',
  ...overrides,
});

describe('memory maintenance scheduler', () => {
  it('does not run when automatic maintenance is disabled', () => {
    const state = { ...baseState(memory()), autoMaintenanceEnabled: false };
    assert.equal(shouldRunMemoryMaintenance(state, new Date('2026-08-21T07:00:00.000Z')), false);
    const result = runMemoryMaintenanceCycle(state, { now: new Date('2026-08-21T07:00:00.000Z') });
    assert.equal(result.ran, false);
    assert.equal(result.skippedReason, 'disabled');
  });

  it('does not run before the maintenance interval has elapsed', () => {
    const state = baseState(memory({ expiresAt: undefined }));
    const now = new Date('2026-08-19T12:00:00.000Z');
    assert.equal(shouldRunMemoryMaintenance(state, now), false);
    const result = runMemoryMaintenanceCycle(state, { now });
    assert.equal(result.ran, false);
    assert.equal(result.skippedReason, 'not-due');
  });

  it('archives expired memories automatically but leaves duplicates and stale candidates untouched', () => {
    const state = baseState(
      memory({ id: 'expired', expiresAt: '2026-08-19T06:00:00.000Z' }),
      memory({ id: 'duplicate-a', expiresAt: undefined, content: 'Same note.' }),
      memory({ id: 'duplicate-b', expiresAt: undefined, content: 'Same note.' }),
    );
    const now = new Date('2026-08-21T07:00:00.000Z');
    const result = runMemoryMaintenanceCycle(state, { now });

    assert.equal(result.ran, true);
    assert.ok(result.plan);
    assert.equal(result.plan?.expiredCandidates.length, 1);
    assert.ok(result.plan?.duplicateGroups.some((group) => group.memoryIds.includes('duplicate-a')));
    assert.equal(result.state.memories.find((item) => item.id === 'expired')?.lifecycle, 'archived');
    assert.equal(result.state.memories.find((item) => item.id === 'duplicate-a')?.lifecycle, 'contextual');
    assert.equal(result.state.memories.find((item) => item.id === 'duplicate-b')?.lifecycle, 'contextual');
    assert.equal(result.state.lastMaintenanceAt, now.toISOString());
  });

  it('uses the configurable interval without changing safe-maintenance policy', () => {
    const state = baseState(memory({ expiresAt: '2026-08-19T06:00:00.000Z' }));
    const now = new Date('2026-08-19T09:00:00.000Z');
    assert.equal(shouldRunMemoryMaintenance(state, now, 60 * 60 * 1000), true);
    assert.equal(shouldRunMemoryMaintenance(state, now, MEMORY_MAINTENANCE_INTERVAL_MS), false);
  });
});
