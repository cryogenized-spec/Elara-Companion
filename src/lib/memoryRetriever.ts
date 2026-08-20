import { MemoryItem, MemoryScratchpadState } from '../types';

export interface RetrievedMemoryResult {
  memory: MemoryItem;
  score: number;
}

/**
 * Clean and tokenize a text string for term matching
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2); // Ignore tiny stop words
}

/**
 * Score a memory item against a query string and recent conversation context
 */
export function scoreMemory(
  memory: MemoryItem,
  queryTokens: Set<string>,
  rawQuery: string,
  userTokens: string[]
): number {
  let score = 0;

  // 1. Text match scoring in content and tags
  const contentTokens = tokenize(memory.content);
  const tagTokens = memory.tags ? memory.tags.flatMap((t) => tokenize(t)) : [];
  const categoryToken = memory.category.toLowerCase();

  let matches = 0;
  for (const token of contentTokens) {
    if (queryTokens.has(token)) matches += 1;
  }
  for (const tagToken of tagTokens) {
    if (queryTokens.has(tagToken)) matches += 2; // Extra weight for explicit tags
  }
  if (queryTokens.has(categoryToken)) {
    matches += 2.5; // Category match
  }

  // Base term frequency score
  score += matches * 2.0;

  // Exact phrase substring match boost
  if (rawQuery.length > 5 && memory.content.toLowerCase().includes(rawQuery.toLowerCase())) {
    score += 5.0;
  }

  // 2. Importance Multiplier
  const importanceMultipliers: Record<string, number> = {
    core: 2.5,
    important: 1.8,
    normal: 1.0,
    low: 0.6,
  };
  const impMult = importanceMultipliers[memory.importance] || 1.0;

  // 3. Pinned Boost
  if (memory.pinned) {
    score += 3.0;
  }

  // 4. Confidence Multiplier
  const confidenceMultipliers: Record<string, number> = {
    certain: 1.2,
    likely: 1.0,
    uncertain: 0.8,
  };
  const confMult = confidenceMultipliers[memory.confidence] || 1.0;

  // 5. Recency Boost (decay factor based on days since update)
  const updatedDate = new Date(memory.updatedAt).getTime();
  const daysOld = Math.max(0, (Date.now() - updatedDate) / (1000 * 60 * 60 * 24));
  const recencyFactor = Math.max(0.5, 1.0 - daysOld * 0.02); // slight decay, minimum 0.5

  // Calculate final weighted score
  const finalScore = (score + 0.5) * impMult * confMult * recencyFactor;
  return finalScore;
}

/**
 * Retrieve relevant memories based on user prompt and conversation history
 */
export function retrieveRelevantMemories(
  scratchpad: MemoryScratchpadState,
  userMessage: string,
  historySnippet: string = '',
  maxResults: number = 10
): MemoryItem[] {
  const combinedQuery = `${userMessage} ${historySnippet}`.trim();
  const rawTokens = tokenize(combinedQuery);
  const queryTokens = new Set(rawTokens);

  if (scratchpad.memories.length === 0) return [];

  const scoredList: RetrievedMemoryResult[] = scratchpad.memories.map((mem) => ({
    memory: mem,
    score: scoreMemory(mem, queryTokens, userMessage, rawTokens),
  }));

  // Sort by score descending
  scoredList.sort((a, b) => b.score - a.score);

  // Filter top scoring items (must pass a minimal relevance threshold or be core/pinned if query is general)
  const results: MemoryItem[] = [];
  for (const item of scoredList) {
    if (results.length >= maxResults) break;

    // Core or pinned memories are always included if score is decent or if memory count is small
    if (item.score > 0.8 || item.memory.pinned || item.memory.importance === 'core' || scratchpad.memories.length <= maxResults) {
      results.push(item.memory);
    }
  }

  return results;
}

/**
 * Assemble retrieved memories into a prompt block for Gemini system context
 */
export function formatMemoriesForPrompt(memories: MemoryItem[], userName: string): string {
  if (!memories || memories.length === 0) return '';

  const formattedName = userName.trim() || 'User';

  const lines: string[] = [
    `=== ELARA'S RELEVANT LONG-TERM MEMORY SCRATCHPAD & NOTES ===`,
    `The following notes are retrieved from your persistent long-term notebook. Use them naturally to inform your understanding, continuity, and relationship. Do NOT explicitly recite or announce that you are pulling from a database or memory file.`,
    ``,
  ];

  memories.forEach((mem, index) => {
    const parsedContent = mem.content.replace(/\[\[user\]\]/gi, formattedName);
    const dateStr = mem.eventDate
      ? `(Event Date: ${mem.eventDate})`
      : `(Recorded: ${new Date(mem.createdAt).toLocaleDateString()})`;
    const typeLabel = mem.isPrivate ? "Elara's Private Note" : 'Shared History Note';

    lines.push(
      `${index + 1}. [${mem.category.toUpperCase()}] [${mem.importance.toUpperCase()}] [Confidence: ${mem.confidence}] [${typeLabel}] ${dateStr}`
    );
    lines.push(`   "${parsedContent}"`);
    if (mem.tags && mem.tags.length > 0) {
      lines.push(`   Tags: ${mem.tags.join(', ')}`);
    }
    lines.push(``);
  });

  return lines.join('\n');
}
