import type { MemoryItem, MemoryLifecycle, MemoryScratchpadState } from '../types';

export interface MemoryMaintenanceConfig {
  now?: Date;
  workingStaleDays?: number;
  contextualStaleDays?: number;
  persistentStaleDays?: number;
  maxDuplicateGroupSize?: number;
}

type NormalizedMemoryMaintenanceConfig = Required<Pick<
  MemoryMaintenanceConfig,
  'workingStaleDays' | 'contextualStaleDays' | 'persistentStaleDays' | 'maxDuplicateGroupSize'
>>;

export interface MemoryMaintenanceCandidate {
  memoryId: string;
  kind: 'stale' | 'expired' | 'duplicate';
  lifecycle: MemoryLifecycle;
  score: number;
  reason: string;
}

export interface MemoryDuplicateGroup {
  fingerprint: string;
  memoryIds: string[];
}

export interface MemoryMaintenancePlan {
  generatedAt: string;
  staleCandidates: MemoryMaintenanceCandidate[];
  expiredCandidates: MemoryMaintenanceCandidate[];
  duplicateGroups: MemoryDuplicateGroup[];
  protectedCount: number;
}

export const DEFAULT_MEMORY_MAINTENANCE_CONFIG = {
  workingStaleDays: 7,
  contextualStaleDays: 30,
  persistentStaleDays: 120,
  maxDuplicateGroupSize: 8,
} as const;

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .trim();
}

export function memoryFingerprint(memory: MemoryItem): string {
  return `${memory.kind || 'context'}|${normalizeText(memory.content)}`;
}

function daysSince(isoDate: string, nowMs: number): number {
  const timestamp = Date.parse(isoDate);
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (nowMs - timestamp) / 86_400_000);
}

function lifecycleStaleDays(lifecycle: MemoryLifecycle, config: NormalizedMemoryMaintenanceConfig): number | null {
  switch (lifecycle) {
    case 'working': return config.workingStaleDays;
    case 'contextual': return config.contextualStaleDays;
    case 'persistent': return config.persistentStaleDays;
    case 'core':
    case 'archived':
    default: return null;
  }
}

function freshnessReference(memory: MemoryItem): string {
  return memory.lastRecalledAt || memory.updatedAt || memory.createdAt;
}

export function calculateMemoryMaintenanceScore(memory: MemoryItem, now = new Date()): number {
  const ageDays = daysSince(freshnessReference(memory), now.getTime());
  const reinforcement = Math.max(0, memory.reinforcementCount || 0);
  const reinforcementBoost = Math.min(0.35, reinforcement * 0.05);
  const importanceBoost = memory.importance === 'core' ? 0.45 : memory.importance === 'important' ? 0.2 : memory.importance === 'normal' ? 0.05 : 0;
  const agePenalty = Number.isFinite(ageDays) ? Math.min(0.8, ageDays / 180) : 0.8;
  return Math.max(0, Math.min(1, 0.5 + reinforcementBoost + importanceBoost - agePenalty));
}

export function buildMemoryMaintenancePlan(
  memories: MemoryItem[],
  options: MemoryMaintenanceConfig = {},
): MemoryMaintenancePlan {
  const config: NormalizedMemoryMaintenanceConfig = { ...DEFAULT_MEMORY_MAINTENANCE_CONFIG, ...options };
  const now = options.now || new Date();
  const staleCandidates: MemoryMaintenanceCandidate[] = [];
  const expiredCandidates: MemoryMaintenanceCandidate[] = [];
  let protectedCount = 0;

  for (const memory of memories) {
    const lifecycle = memory.lifecycle || 'persistent';
    const protectedMemory = memory.pinned === true || lifecycle === 'core' || memory.importance === 'core';
    if (protectedMemory) {
      protectedCount++;
      continue;
    }

    if (memory.expiresAt && Date.parse(memory.expiresAt) <= now.getTime() && lifecycle !== 'archived') {
      expiredCandidates.push({
        memoryId: memory.id,
        kind: 'expired',
        lifecycle,
        score: calculateMemoryMaintenanceScore(memory, now),
        reason: `Explicit expiry reached on ${memory.expiresAt}.`,
      });
      continue;
    }

    const threshold = lifecycleStaleDays(lifecycle, config);
    if (threshold == null || lifecycle === 'archived') continue;

    const ageDays = daysSince(freshnessReference(memory), now.getTime());
    if (ageDays >= threshold) {
      staleCandidates.push({
        memoryId: memory.id,
        kind: 'stale',
        lifecycle,
        score: calculateMemoryMaintenanceScore(memory, now),
        reason: `No recent reinforcement for approximately ${Math.round(ageDays)} days; lifecycle '${lifecycle}' is past its ${threshold}-day freshness window.`,
      });
    }
  }

  const groups = new Map<string, string[]>();
  for (const memory of memories) {
    if (memory.lifecycle === 'archived') continue;
    const fingerprint = memoryFingerprint(memory);
    const ids = groups.get(fingerprint) || [];
    if (ids.length < config.maxDuplicateGroupSize) ids.push(memory.id);
    groups.set(fingerprint, ids);
  }

  const duplicateGroups: MemoryDuplicateGroup[] = [];
  for (const [fingerprint, memoryIds] of groups) {
    if (memoryIds.length > 1) duplicateGroups.push({ fingerprint, memoryIds });
  }

  return { generatedAt: now.toISOString(), staleCandidates, expiredCandidates, duplicateGroups, protectedCount };
}

export function applySafeMemoryMaintenance(
  state: MemoryScratchpadState,
  plan: MemoryMaintenancePlan,
): MemoryScratchpadState {
  const expiredIds = new Set(plan.expiredCandidates.map((candidate) => candidate.memoryId));
  const memories = state.memories.map((memory) => {
    if (!expiredIds.has(memory.id)) return memory;
    if (memory.pinned || memory.lifecycle === 'core' || memory.importance === 'core') return memory;
    return { ...memory, lifecycle: 'archived' as const, state: 'archived' as const, updatedAt: plan.generatedAt };
  });

  return { ...state, memories, lastMaintenanceAt: plan.generatedAt, schemaVersion: 3 };
}
