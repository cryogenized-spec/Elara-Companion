import type { MemoryItem } from '../types';

export const ACTIVE_SCRATCHPAD_KEY = 'elara_active_scratchpad_v1';
export const SCRATCHPAD_EVENT = 'elara:scratchpad-updated';

export function buildPersistentScratchpad(memories: MemoryItem[]): string {
  const ranked = [...memories].sort((a, b) => {
    const importanceRank: Record<string, number> = { core: 4, important: 3, normal: 2, low: 1 };
    return (importanceRank[b.importance] || 0) - (importanceRank[a.importance] || 0);
  }).slice(0, 40);

  if (ranked.length === 0) return '';

  return ranked
    .map((memory) => `- [${memory.isPrivate ? 'PRIVATE OBSERVATION' : 'SHARED FACT'}] [${memory.category}]${memory.kind ? ` [${memory.kind}]` : ''} [${memory.confidence}] ${memory.content}`)
    .join('\n');
}

export function persistMemoryScratchpad(memories: MemoryItem[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

  const scratchpad = buildPersistentScratchpad(memories);
  try {
    localStorage.setItem(ACTIVE_SCRATCHPAD_KEY, scratchpad);
    window.dispatchEvent(new CustomEvent(SCRATCHPAD_EVENT, { detail: { scratchpad } }));
  } catch (error) {
    console.warn('Persistent scratchpad mirror unavailable:', error);
  }
}
