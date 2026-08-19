import { MemoryItem, MemoryScratchpadState } from '../types';

export interface RetrievedMemoryResult {
  memory: MemoryItem;
  score: number;
}

const DEFAULT_MAX_RESULTS = 10;
const DEFAULT_PROTECTED_RESULTS = 2;
const DEFAULT_CATEGORY_CAP = 3;
const DAY_MS = 1000 * 60 * 60 * 24;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/gi, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function overlapScore(tokens: string[], queryTokens: Set<string>): number {
  let score = 0;
  for (const token of tokens) if (queryTokens.has(token)) score += 1;
  return score;
}

function daysSince(isoDate: string | undefined, nowMs: number): number {
  if (!isoDate) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(isoDate);
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (nowMs - timestamp) / DAY_MS);
}

function lifecycleWeight(memory: MemoryItem): number {
  switch (memory.lifecycle) {
    case 'core': return 1.45;
    case 'persistent': return 1.15;
    case 'contextual': return 1.0;
    case 'working': return 0.9;
    case 'archived': return 0;
    default: return 1.0;
  }
}

function importanceWeight(memory: MemoryItem): number {
  switch (memory.importance) {
    case 'core': return 1.4;
    case 'important': return 1.2;
    case 'normal': return 1.0;
    case 'low': return 0.75;
    default: return 1.0;
  }
}

function confidenceWeight(memory: MemoryItem): number {
  switch (memory.confidence) {
    case 'certain': return 1.15;
    case 'likely': return 1.0;
    case 'uncertain': return 0.8;
    default: return 1.0;
  }
}

function recencyWeight(memory: MemoryItem, nowMs: number): number {
  const reference = memory.lastRecalledAt || memory.updatedAt || memory.createdAt;
  const ageDays = daysSince(reference, nowMs);
  if (!Number.isFinite(ageDays)) return 0.8;
  return Math.max(0.55, Math.min(1.15, 1.12 - ageDays * 0.01));
}

function reinforcementWeight(memory: MemoryItem): number {
  const count = Math.max(0, memory.reinforcementCount || 0);
  return 1 + Math.min(0.25, count * 0.04);
}

function taxonomyAffinity(memory: MemoryItem, queryTokens: Set<string>): number {
  const semanticTokens = [
    memory.kind || '',
    memory.lifecycle || '',
    memory.source || '',
    memory.category,
    ...(memory.tags || []),
  ].flatMap(tokenize);

  return overlapScore(semanticTokens, queryTokens) * 0.9;
}

function sourceContextAffinity(memory: MemoryItem, rawQuery: string): number {
  const query = rawQuery.toLowerCase();
  let boost = 0;
  if (memory.source === 'artifact' && /(artifact|canvas|document|note|diagram)/.test(query)) boost += 1.5;
  if (memory.source === 'conversation' && /(conversation|chat|discussion|said|mentioned)/.test(query)) boost += 1.0;
  if (memory.source === 'user' && /(i |my |me |mine)/.test(query)) boost += 0.7;
  if (memory.kind === 'project' && /(project|build|implement|code|repo|feature|phase|pass)/.test(query)) boost += 1.4;
  if (memory.kind === 'preference' && /(prefer|preference|like|dislike|usually|want)/.test(query)) boost += 1.1;
  if (memory.kind === 'relationship' && /(you|we|us|relationship|together)/.test(query)) boost += 0.8;
  return boost;
}

/**
 * Score a memory against the current request using relevance, taxonomy,
 * importance, confidence, recency, reinforcement and conversational affinity.
 */
export function scoreMemory(
  memory: MemoryItem,
  queryTokens: Set<string>,
  rawQuery: string,
  userTokens: string[],
  now = new Date(),
): number {
  if (memory.lifecycle === 'archived') return -Infinity;

  const contentTokens = tokenize(memory.content);
  const tagTokens = (memory.tags || []).flatMap(tokenize);
  const categoryTokens = tokenize(memory.category);
  const contentMatches = overlapScore(contentTokens, queryTokens);
  const tagMatches = overlapScore(tagTokens, queryTokens) * 2;
  const categoryMatches = overlapScore(categoryTokens, queryTokens) * 1.5;
  const taxonomy = taxonomyAffinity(memory, queryTokens);
  const exactPhrase = rawQuery.trim().length > 5 && memory.content.toLowerCase().includes(rawQuery.toLowerCase()) ? 5 : 0;
  const historyMatches = overlapScore(contentTokens, new Set(userTokens)) * 0.25;

  const lexical = contentMatches * 2.0 + tagMatches + categoryMatches + exactPhrase + historyMatches + taxonomy;
  const affinity = sourceContextAffinity(memory, rawQuery);
  const temporal = recencyWeight(memory, now.getTime());
  const multiplier = importanceWeight(memory) * confidenceWeight(memory) * lifecycleWeight(memory) * temporal * reinforcementWeight(memory);
  const protectionBoost = memory.pinned || memory.importance === 'core' || memory.lifecycle === 'core' ? 3.5 : 0;

  return Math.max(0, (lexical + affinity + 0.35 + protectionBoost) * multiplier);
}

/**
 * Retrieve a compact "ready state" from persistent memory.
 * Protected core/pinned items are included first, followed by contextual hits.
 * Archived items never enter active model context.
 */
export function retrieveRelevantMemories(
  scratchpad: MemoryScratchpadState,
  userMessage: string,
  historySnippet: string = '',
  maxResults: number = DEFAULT_MAX_RESULTS,
): MemoryItem[] {
  if (scratchpad.memories.length === 0 || maxResults <= 0) return [];

  const combinedQuery = `${userMessage} ${historySnippet}`.trim();
  const rawTokens = tokenize(combinedQuery);
  const queryTokens = new Set(rawTokens);
  const now = new Date();

  const eligible = scratchpad.memories.filter((memory) => memory.lifecycle !== 'archived');
  const protectedMemories = eligible
    .filter((memory) => memory.pinned || memory.importance === 'core' || memory.lifecycle === 'core')
    .sort((a, b) => scoreMemory(b, queryTokens, userMessage, rawTokens, now) - scoreMemory(a, queryTokens, userMessage, rawTokens, now))
    .slice(0, Math.min(DEFAULT_PROTECTED_RESULTS, maxResults));

  const protectedIds = new Set(protectedMemories.map((memory) => memory.id));
  const ranked = eligible
    .filter((memory) => !protectedIds.has(memory.id))
    .map((memory) => ({
      memory,
      score: scoreMemory(memory, queryTokens, userMessage, rawTokens, now),
    }))
    .filter((item) => item.score > 0.65 || scratchpad.memories.length <= maxResults)
    .sort((a, b) => b.score - a.score);

  const results: MemoryItem[] = [...protectedMemories];
  const categoryCounts = new Map<string, number>();
  for (const memory of protectedMemories) categoryCounts.set(memory.category, (categoryCounts.get(memory.category) || 0) + 1);

  for (const item of ranked) {
    if (results.length >= maxResults) break;
    const count = categoryCounts.get(item.memory.category) || 0;
    if (count >= DEFAULT_CATEGORY_CAP) continue;
    results.push(item.memory);
    categoryCounts.set(item.memory.category, count + 1);
  }

  if (results.length < maxResults) {
    for (const item of ranked) {
      if (results.length >= maxResults) break;
      if (!results.some((memory) => memory.id === item.memory.id)) results.push(item.memory);
    }
  }

  return results.slice(0, maxResults);
}

/**
 * Assemble retrieved memories into a compact prompt block for Gemini system context.
 */
export function formatMemoriesForPrompt(memories: MemoryItem[], userName: string): string {
  if (!memories || memories.length === 0) return '';

  const formattedName = userName.trim() || 'User';
  const lines: string[] = [
    `=== ELARA'S RELEVANT LONG-TERM MEMORY ===`,
    `These are selected from Elara's persistent notebook for the current context. Use them naturally for continuity; do not mention databases, retrieval, ranking, or this block unless directly asked.`,
    ``,
  ];

  memories.forEach((memory, index) => {
    const parsedContent = memory.content.replace(/\[\[user\]\]/gi, formattedName);
    const dateStr = memory.eventDate
      ? `(Event: ${memory.eventDate})`
      : `(Recorded: ${new Date(memory.createdAt).toLocaleDateString()})`;
    const visibility = memory.isPrivate ? "Elara's private note" : 'Shared history';
    const kind = memory.kind ? ` [${memory.kind}]` : '';
    const lifecycle = memory.lifecycle && memory.lifecycle !== 'persistent' ? ` [${memory.lifecycle}]` : '';

    lines.push(`${index + 1}. [${memory.category.toUpperCase()}] [${memory.importance.toUpperCase()}]${kind}${lifecycle} [${memory.confidence}] [${visibility}] ${dateStr}`);
    lines.push(`   "${parsedContent}"`);
    if (memory.tags?.length) lines.push(`   Tags: ${memory.tags.join(', ')}`);
    lines.push('');
  });

  return lines.join('\n');
}
