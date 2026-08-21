import type { MemoryItem, MemoryResolution, MemoryState } from '../types';

export interface MemoryRetrievalOptions {
  limit?: number;
  now?: Date;
  minimumScore?: number;
  includeArchived?: boolean;
  includeConflicted?: boolean;
  topicHints?: string[];
  projectId?: string;
}

export interface MemoryRetrievalResult {
  memory: MemoryItem;
  score: number;
  reasons: string[];
}

export type MemoryRetrievalDisposition = 'selected' | 'below-threshold' | 'filtered-archived' | 'filtered-conflicted' | 'filtered-superseded' | 'trimmed-by-limit';

export interface MemoryRetrievalCandidate extends MemoryRetrievalResult {
  disposition: MemoryRetrievalDisposition;
}

export interface MemoryRetrievalTrace {
  query: string;
  generatedAt: string;
  limit: number;
  minimumScore: number;
  contextMaxChars: number;
  candidateCount: number;
  selectedCount: number;
  injectedCount: number;
  contextChars: number;
  selectedIds: string[];
  candidates: MemoryRetrievalCandidate[];
}

const DEFAULT_LIMIT = 8;
const DEFAULT_MINIMUM_SCORE = 0.18;
export const DEFAULT_MEMORY_CONTEXT_MAX_CHARS = 6000;

function normalizeText(value: string): string {
  return value.toLocaleLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}
function tokenSet(value: string): Set<string> { return new Set(normalizeText(value).split(' ').filter((token) => token.length >= 3)); }
function jaccard(left: Set<string>, right: Set<string>): number { if (left.size === 0 || right.size === 0) return 0; let intersection = 0; for (const token of left) if (right.has(token)) intersection++; return intersection / (left.size + right.size - intersection); }
function daysSince(isoDate: string | undefined, nowMs: number): number { if (!isoDate) return Number.POSITIVE_INFINITY; const timestamp = Date.parse(isoDate); if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY; return Math.max(0, (nowMs - timestamp) / 86_400_000); }
function resolutionWeight(resolution?: MemoryResolution): number { switch (resolution) { case 'core': return 1; case 'synthesized': return 0.95; case 'contextual': return 0.82; case 'episodic': return 0.7; case 'observation': return 0.58; default: return 0.65; } }
function stateWeight(state?: MemoryState): number { switch (state) { case 'active': return 1; case 'stale': return 0.55; case 'conflicted': return 0.45; case 'superseded': return 0.1; case 'archived': return 0; default: return 0.85; } }
function importanceWeight(importance: MemoryItem['importance']): number { switch (importance) { case 'core': return 1; case 'important': return 0.82; case 'normal': return 0.6; case 'low': return 0.35; default: return 0.5; } }
function freshnessWeight(memory: MemoryItem, nowMs: number): number { const reference = memory.lastObservedAt || memory.lastRecalledAt || memory.updatedAt || memory.createdAt; const ageDays = daysSince(reference, nowMs); if (!Number.isFinite(ageDays)) return 0.15; return Math.max(0.15, Math.exp(-ageDays / 90)); }
function topicScore(memory: MemoryItem, queryTokens: Set<string>, topicHints: string[]): number { const searchable = [memory.content, memory.category, memory.kind || '', ...(memory.tags || [])].join(' '); const score = jaccard(queryTokens, tokenSet(searchable)); if (topicHints.length === 0) return score; const hints = tokenSet(topicHints.join(' ')); return Math.max(score, jaccard(hints, tokenSet(searchable)) * 0.95); }
function projectScore(memory: MemoryItem, projectId?: string): number { if (!projectId) return 0; if (memory.sourceArtifactId === projectId) return 1; return memory.relatedMemoryIds?.includes(projectId) ? 0.8 : 0; }

export function scoreMemory(memory: MemoryItem, queryTokens: Set<string>, options: MemoryRetrievalOptions): MemoryRetrievalResult {
  const nowMs = (options.now || new Date()).getTime();
  const semantic = jaccard(queryTokens, tokenSet(memory.content));
  const topic = topicScore(memory, queryTokens, options.topicHints || []);
  const project = projectScore(memory, options.projectId);
  const freshness = freshnessWeight(memory, nowMs);
  const importance = importanceWeight(memory.importance);
  const resolution = resolutionWeight(memory.resolution);
  const state = stateWeight(memory.state);
  const reinforcement = Math.min(1, (memory.reinforcementCount || 0) / 6);
  const evidence = Math.min(1, (memory.evidenceCount || 0) / 6);
  const score = Math.max(0, Math.min(1, semantic * 0.4 + topic * 0.14 + project * 0.14 + freshness * 0.1 + importance * 0.08 + resolution * 0.05 + state * 0.04 + reinforcement * 0.025 + evidence * 0.025));
  const reasons: string[] = [];
  if (semantic >= 0.5) reasons.push('strong content match'); else if (semantic >= 0.2) reasons.push('partial content match');
  if (topic >= 0.25) reasons.push('topic match');
  if (project > 0) reasons.push('project relationship');
  if (freshness >= 0.7) reasons.push('recent');
  if (importance >= 0.8) reasons.push('high importance');
  if (resolution === 1) reasons.push('core memory');
  if (reinforcement >= 0.5 || evidence >= 0.5) reasons.push('well supported');
  if (state < 0.7) reasons.push(`reduced weight: ${memory.state || 'legacy'}`);
  return { memory, score, reasons };
}

function sortResults<T extends MemoryRetrievalResult>(results: T[]): T[] {
  return [...results].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    const updated = (right.memory.updatedAt || '').localeCompare(left.memory.updatedAt || '');
    if (updated !== 0) return updated;
    return left.memory.id.localeCompare(right.memory.id);
  });
}

export function retrieveRelevantMemories(memories: MemoryItem[], query: string, options: MemoryRetrievalOptions = {}): MemoryRetrievalResult[] {
  const limit = Math.max(1, Math.min(32, options.limit ?? DEFAULT_LIMIT));
  const minimumScore = Math.max(0, Math.min(1, options.minimumScore ?? DEFAULT_MINIMUM_SCORE));
  const queryTokens = tokenSet(query);
  return sortResults(memories
    .filter((memory) => options.includeArchived || memory.state !== 'archived')
    .filter((memory) => options.includeConflicted || memory.state !== 'conflicted')
    .filter((memory) => memory.state !== 'superseded')
    .map((memory) => scoreMemory(memory, queryTokens, options))
    .filter((result) => result.score >= minimumScore)
  ).slice(0, limit);
}

export function inspectMemoryRetrieval(memories: MemoryItem[], query: string, options: MemoryRetrievalOptions = {}): MemoryRetrievalTrace {
  const limit = Math.max(1, Math.min(32, options.limit ?? DEFAULT_LIMIT));
  const minimumScore = Math.max(0, Math.min(1, options.minimumScore ?? DEFAULT_MINIMUM_SCORE));
  const now = options.now || new Date();
  const queryTokens = tokenSet(query);
  const scored = memories.map((memory) => scoreMemory(memory, queryTokens, options));
  const candidates: MemoryRetrievalCandidate[] = scored.map((result) => {
    let disposition: MemoryRetrievalDisposition = 'selected';
    if (!options.includeArchived && result.memory.state === 'archived') disposition = 'filtered-archived';
    else if (!options.includeConflicted && result.memory.state === 'conflicted') disposition = 'filtered-conflicted';
    else if (result.memory.state === 'superseded') disposition = 'filtered-superseded';
    else if (result.score < minimumScore) disposition = 'below-threshold';
    return { ...result, disposition };
  });
  const eligible = sortResults(scored.filter((result) => {
    if (!options.includeArchived && result.memory.state === 'archived') return false;
    if (!options.includeConflicted && result.memory.state === 'conflicted') return false;
    if (result.memory.state === 'superseded') return false;
    return result.score >= minimumScore;
  }));
  const selected = eligible.slice(0, limit);
  const selectedIds = new Set(selected.map((result) => result.memory.id));
  for (const candidate of candidates) {
    if (candidate.disposition === 'selected' && !selectedIds.has(candidate.memory.id)) candidate.disposition = 'trimmed-by-limit';
  }
  return {
    query,
    generatedAt: now.toISOString(),
    limit,
    minimumScore,
    contextMaxChars: DEFAULT_MEMORY_CONTEXT_MAX_CHARS,
    candidateCount: memories.length,
    selectedCount: selected.length,
    injectedCount: 0,
    contextChars: 0,
    selectedIds: selected.map((result) => result.memory.id),
    candidates: sortResults(candidates),
  };
}

export function withInjectedMemoryTrace(trace: MemoryRetrievalTrace, injectedResults: MemoryRetrievalResult[], context: string): MemoryRetrievalTrace {
  return {
    ...trace,
    injectedCount: injectedResults.length,
    contextChars: context.length,
    selectedIds: injectedResults.map((result) => result.memory.id),
  };
}

export function formatRetrievedMemoryContext(results: MemoryRetrievalResult[], maxChars = DEFAULT_MEMORY_CONTEXT_MAX_CHARS): string {
  if (results.length === 0 || maxChars <= 0) return '';
  const lines: string[] = [];
  let used = 0;
  for (const { memory, score } of results) {
    const resolution = memory.resolution || 'contextual';
    const confidence = memory.confidence || 'uncertain';
    const prefix = `- [${resolution}] [${confidence}] [relevance ${(score * 100).toFixed(0)}%] `;
    const available = maxChars - used;
    if (available <= prefix.length + 1) break;
    const content = memory.content.replace(/\s+/g, ' ').trim();
    const lineBudget = available - prefix.length - 1;
    const shortened = content.length > lineBudget ? `${content.slice(0, Math.max(0, lineBudget - 1)).trimEnd()}…` : content;
    const line = `${prefix}${shortened}`;
    lines.push(line);
    used += line.length + 1;
    if (shortened.length < content.length) break;
  }
  return lines.join('\n');
}
