import type { MemoryItem, MemoryResolution, MemoryState } from '../types';

export interface MemoryConsolidationCandidate {
  sourceId: string;
  targetId?: string;
  kind: 'reinforce' | 'duplicate' | 'conflict' | 'promote';
  score: number;
  reason: string;
}

export interface MemoryConsolidationResult {
  memories: MemoryItem[];
  candidates: MemoryConsolidationCandidate[];
}

export interface MemoryConsolidationCandidateStats {
  activeMemoryCount: number;
  theoreticalPairCount: number;
  candidatePairCount: number;
}

const normalizeText = (value: string): string => value
  .toLocaleLowerCase()
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokenSet = (value: string): Set<string> => new Set(normalizeText(value).split(' ').filter((token) => token.length >= 3));

const jaccard = (left: Set<string>, right: Set<string>): number => {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection++;
  return intersection / (left.size + right.size - intersection);
};

export function semanticMemorySimilarity(left: MemoryItem, right: MemoryItem): number {
  return jaccard(tokenSet(left.content), tokenSet(right.content));
}

function memoryResolution(memory: MemoryItem): MemoryResolution {
  return memory.resolution || (memory.kind === 'observation' ? 'observation' : 'contextual');
}

function memoryState(memory: MemoryItem): MemoryState {
  return memory.state || 'active';
}

function isContradictory(left: MemoryItem, right: MemoryItem): boolean {
  const leftText = normalizeText(left.content);
  const rightText = normalizeText(right.content);
  const oppositePairs = [
    ['likes', 'dislikes'], ['prefers', 'avoids'], ['uses', 'does not use'],
    ['wants', 'does not want'], ['is vegetarian', 'eats meat'],
  ];
  return oppositePairs.some(([a, b]) => (leftText.includes(a) && rightText.includes(b)) || (leftText.includes(b) && rightText.includes(a)));
}

function shouldPromote(memory: MemoryItem): boolean {
  const reinforcement = memory.reinforcementCount || 0;
  const evidence = memory.evidenceCount || 0;
  const resolution = memoryResolution(memory);
  if (resolution !== 'observation') return false;
  return reinforcement >= 3 || evidence >= 3;
}

function promotedResolution(memory: MemoryItem): MemoryResolution {
  if (memory.kind === 'preference' || memory.kind === 'fact') return 'core';
  if (memory.kind === 'project' || memory.kind === 'plan' || memory.kind === 'working') return 'contextual';
  return 'episodic';
}

function buildCandidatePairs(memories: MemoryItem[]): Array<[number, number]> {
  const activeIndices: number[] = [];
  const tokenIndex = new Map<string, number[]>();

  memories.forEach((memory, index) => {
    if (memoryState(memory) !== 'active') return;
    activeIndices.push(index);
    for (const token of tokenSet(memory.content)) {
      const bucket = tokenIndex.get(token);
      if (bucket) bucket.push(index);
      else tokenIndex.set(token, [index]);
    }
  });

  const pairs: Array<[number, number]> = [];
  for (const sourceIndex of activeIndices) {
    const targetIndexes = new Set<number>();
    for (const token of tokenSet(memories[sourceIndex].content)) {
      for (const targetIndex of tokenIndex.get(token) || []) {
        if (targetIndex > sourceIndex) targetIndexes.add(targetIndex);
      }
    }
    for (const targetIndex of Array.from(targetIndexes).sort((left, right) => left - right)) {
      pairs.push([sourceIndex, targetIndex]);
    }
  }
  return pairs;
}

export function getConsolidationCandidateStats(memories: MemoryItem[]): MemoryConsolidationCandidateStats {
  const activeMemoryCount = memories.reduce((count, memory) => count + (memoryState(memory) === 'active' ? 1 : 0), 0);
  const theoreticalPairCount = activeMemoryCount < 2 ? 0 : (activeMemoryCount * (activeMemoryCount - 1)) / 2;
  return {
    activeMemoryCount,
    theoreticalPairCount,
    candidatePairCount: buildCandidatePairs(memories).length,
  };
}

export function consolidateMemories(memories: MemoryItem[], now = new Date()): MemoryConsolidationResult {
  const next = memories.map((memory) => ({ ...memory }));
  const candidates: MemoryConsolidationCandidate[] = [];
  const tokenSets = next.map((memory) => tokenSet(memory.content));
  const nowIso = now.toISOString();

  for (const [index, otherIndex] of buildCandidatePairs(next)) {
    const source = next[index];
    const target = next[otherIndex];
    if (memoryState(source) !== 'active' || memoryState(target) !== 'active') continue;

    const similarity = jaccard(tokenSets[index], tokenSets[otherIndex]);
    if (similarity >= 0.82) {
      candidates.push({ sourceId: source.id, targetId: target.id, kind: 'duplicate', score: similarity, reason: 'High semantic similarity; candidate for later merge.' });
      const preferred = (target.importance === 'core' || target.importance === 'important') && target.importance !== source.importance ? target : source;
      preferred.reinforcementCount = (preferred.reinforcementCount || 0) + 1;
      preferred.evidenceCount = Math.max(preferred.evidenceCount || 0, (source.evidenceCount || 0) + (target.evidenceCount || 0), 1);
      preferred.lastObservedAt = nowIso;
      preferred.updatedAt = nowIso;
      preferred.resolution = preferred.resolution || 'observation';
      preferred.state = preferred.state || 'active';
    } else if (similarity >= 0.5 && isContradictory(source, target)) {
      source.state = 'conflicted';
      target.state = 'conflicted';
      source.conflictMemoryIds = Array.from(new Set([...(source.conflictMemoryIds || []), target.id]));
      target.conflictMemoryIds = Array.from(new Set([...(target.conflictMemoryIds || []), source.id]));
      candidates.push({ sourceId: source.id, targetId: target.id, kind: 'conflict', score: similarity, reason: 'Related memories contain potentially contradictory claims.' });
    }
  }

  for (const source of next) {
    if (memoryState(source) !== 'active') continue;
    if (shouldPromote(source)) {
      const resolution = promotedResolution(source);
      source.resolution = resolution;
      source.state = 'active';
      source.reinforcementCount = Math.max(source.reinforcementCount || 0, 3);
      candidates.push({ sourceId: source.id, kind: 'promote', score: 0.8, reason: `Observation has accumulated enough reinforcement/evidence to promote to '${resolution}'.` });
    }
  }

  return { memories: next, candidates };
}
