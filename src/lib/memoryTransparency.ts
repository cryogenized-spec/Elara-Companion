import type { MemoryItem, MemoryScratchpadState } from '../types';

export interface MemoryTransparencySummary {
  schemaVersion: number;
  total: number;
  active: number;
  stale: number;
  archived: number;
  conflicted: number;
  superseded: number;
  pinned: number;
  core: number;
  privateCount: number;
  withEvidence: number;
  evidenceTotal: number;
  lastMaintenanceAt: string | null;
}

export function summarizeMemoryState(state: MemoryScratchpadState): MemoryTransparencySummary {
  const memories = Array.isArray(state?.memories) ? state.memories : [];

  return memories.reduce<MemoryTransparencySummary>((summary, memory: MemoryItem) => {
    const stateValue = memory.state || 'active';
    const lifecycle = memory.lifecycle || 'persistent';
    const evidenceCount = Math.max(0, memory.evidenceCount || 0);

    summary.total += 1;
    if (stateValue === 'active') summary.active += 1;
    if (stateValue === 'stale') summary.stale += 1;
    if (stateValue === 'archived' || lifecycle === 'archived') summary.archived += 1;
    if (stateValue === 'conflicted') summary.conflicted += 1;
    if (stateValue === 'superseded') summary.superseded += 1;
    if (memory.pinned) summary.pinned += 1;
    if (memory.importance === 'core' || lifecycle === 'core') summary.core += 1;
    if (memory.isPrivate) summary.privateCount += 1;
    if (evidenceCount > 0 || (memory.evidenceMemoryIds?.length || 0) > 0) summary.withEvidence += 1;
    summary.evidenceTotal += evidenceCount;

    return summary;
  }, {
    schemaVersion: Number(state?.schemaVersion || 0),
    total: 0,
    active: 0,
    stale: 0,
    archived: 0,
    conflicted: 0,
    superseded: 0,
    pinned: 0,
    core: 0,
    privateCount: 0,
    withEvidence: 0,
    evidenceTotal: 0,
    lastMaintenanceAt: typeof state?.lastMaintenanceAt === 'string' ? state.lastMaintenanceAt : null,
  });
}

export function explainMemoryState(state: MemoryItem['state']): string {
  switch (state) {
    case 'stale': return 'Retained as evidence, but normally given less retrieval weight until reinforced again.';
    case 'archived': return 'Retained for history/inspection and excluded from normal retrieval.';
    case 'conflicted': return 'Conflicting evidence exists; normal retrieval excludes this record until reconciled.';
    case 'superseded': return 'A newer or more accurate memory replaced this record; it remains for provenance.';
    case 'active':
    default: return 'Eligible for normal retrieval when it is relevant to the current conversation.';
  }
}
