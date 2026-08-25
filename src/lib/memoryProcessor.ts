import { MemoryAction, MemoryItem, MemoryLink, MemoryScratchpadState } from '../types';
import { consolidateMemories } from './memoryConsolidation';
import { recordLiveMemoryActivity } from './thinkingLiveRuntime';

const ACTIVE_SCRATCHPAD_KEY = 'elara_active_scratchpad_v1';
const SCRATCHPAD_EVENT = 'elara:scratchpad-updated';

function buildPersistentScratchpad(memories: MemoryItem[]): string {
  const ranked = [...memories].sort((a, b) => {
    const importanceRank: Record<string, number> = { core: 4, important: 3, normal: 2, low: 1 };
    return (importanceRank[b.importance] || 0) - (importanceRank[a.importance] || 0);
  }).slice(0, 40);
  if (ranked.length === 0) return '';
  return ranked.map((memory) => `- [${memory.isPrivate ? 'PRIVATE OBSERVATION' : 'SHARED FACT'}] [${memory.category}]${memory.kind ? ` [${memory.kind}]` : ''} [${memory.confidence}] ${memory.content}`).join('\n');
}

function normalizeMemoryLinks(links: MemoryLink[] | undefined, conversationId?: string, sourceArtifactId?: string): MemoryLink[] | undefined {
  const next: MemoryLink[] = [];
  const pushUnique = (link: MemoryLink) => { if (!link.id || next.some((existing) => existing.type === link.type && existing.id === link.id)) return; next.push(link); };
  for (const link of links || []) if (link?.type && link.id) pushUnique(link);
  if (conversationId) pushUnique({ type: 'conversation', id: conversationId, label: 'Source conversation' });
  if (sourceArtifactId) pushUnique({ type: 'artifact', id: sourceArtifactId, label: 'Source artifact' });
  return next.length ? next : undefined;
}

function deriveInitialResolution(kind?: MemoryItem['kind'], lifecycle?: MemoryItem['lifecycle']): MemoryItem['resolution'] {
  if (kind === 'observation') return 'observation';
  if (kind === 'episode') return 'episodic';
  if (lifecycle === 'core') return 'core';
  if (kind === 'project' || kind === 'plan' || kind === 'working' || lifecycle === 'working' || lifecycle === 'contextual') return 'contextual';
  return 'contextual';
}

function persistScratchpad(memories: MemoryItem[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  const scratchpad = buildPersistentScratchpad(memories);
  try { localStorage.setItem(ACTIVE_SCRATCHPAD_KEY, scratchpad); window.dispatchEvent(new CustomEvent(SCRATCHPAD_EVENT, { detail: { scratchpad } })); }
  catch (err) { console.warn('Persistent scratchpad mirror unavailable:', err); }
}

export function processMemoryActions(state: MemoryScratchpadState, actions: MemoryAction[], sourceConversationId?: string, sourceArtifactId?: string): MemoryScratchpadState {
  let currentMemories = [...state.memories];
  let stateModified = false;
  for (const action of actions) {
    if (action.type === 'ADD' || action.type === 'CREATE') {
      if (!action.memory?.content) continue;
      const now = new Date().toISOString();
      const next: MemoryItem = {
        id: crypto.randomUUID(), content: action.memory.content, kind: action.memory.kind || 'observation', lifecycle: action.memory.lifecycle || 'persistent', source: action.memory.source || 'elara',
        confidence: action.memory.confidence || 'certain', importance: action.memory.importance || 'important', isPrivate: action.memory.isPrivate ?? true,
        category: action.memory.category || 'Observations', createdAt: now, updatedAt: now,
        tags: action.memory.tags || [], sourceConversationId, sourceArtifactId,
        relatedMemoryIds: action.memory.relatedMemoryIds, links: normalizeMemoryLinks(action.memory.links, sourceConversationId, sourceArtifactId),
        resolution: action.memory.resolution || deriveInitialResolution(action.memory.kind, action.memory.lifecycle), state: action.memory.state || 'active',
        lastObservedAt: now, retrievalCount: 0, evidenceCount: 1,
      };
      currentMemories.unshift(next);
      stateModified = true;
    }

    if (action.type === 'UPDATE' && action.targetId && action.memory) {
      currentMemories = currentMemories.map((memory) => memory.id === action.targetId ? {
        ...memory,
        content: action.memory?.content ?? memory.content,
        kind: action.memory?.kind ?? memory.kind,
        lifecycle: action.memory?.lifecycle ?? memory.lifecycle,
        confidence: action.memory?.confidence ?? memory.confidence,
        importance: action.memory?.importance ?? memory.importance,
        category: action.memory?.category ?? memory.category,
        updatedAt: new Date().toISOString(),
      } : memory);
      stateModified = true;
    }

    if (action.type === 'DELETE' && action.targetId) {
      const before = currentMemories.length;
      currentMemories = currentMemories.filter((memory) => memory.id !== action.targetId);
      stateModified = stateModified || currentMemories.length !== before;
    }

    if (action.type === 'MERGE' && action.mergeTargetIds?.length && action.memory?.content) {
      const mergeSet = new Set(action.mergeTargetIds);
      const merged = currentMemories.filter((memory) => mergeSet.has(memory.id));
      if (merged.length > 0) {
        const synthesizedId = crypto.randomUUID();
        const now = new Date().toISOString();
        const mergedEvidenceIds = Array.from(new Set(merged.flatMap((memory) => memory.evidenceMemoryIds || []).concat(merged.map((memory) => memory.id))));
        const mergedRelatedIds = Array.from(new Set([...merged.map((m) => m.id), ...merged.flatMap((m) => m.relatedMemoryIds || []), ...(action.memory.relatedMemoryIds || [])])).filter((id) => id !== synthesizedId);
        currentMemories = currentMemories.map((memory) => mergeSet.has(memory.id) ? { ...memory, state: 'superseded' as const, supersededByMemoryId: synthesizedId, updatedAt: now } : memory);
        currentMemories.unshift({
          id: synthesizedId, content: action.memory.content, kind: action.memory.kind || 'observation', lifecycle: action.memory.lifecycle || 'persistent', source: action.memory.source || 'elara',
          confidence: action.memory.confidence || 'certain', importance: action.memory.importance || 'important', isPrivate: action.memory.isPrivate ?? merged.every((m) => m.isPrivate),
          category: action.memory.category || 'Observations', createdAt: now, updatedAt: now, tags: action.memory.tags || ['merged', 'synthesized'],
          sourceConversationId, sourceArtifactId, relatedMemoryIds: mergedRelatedIds, links: normalizeMemoryLinks(action.memory.links || merged.flatMap((m) => m.links || []), sourceConversationId, sourceArtifactId),
          resolution: action.memory.resolution || 'synthesized', state: action.memory.state || 'active', lastObservedAt: now, retrievalCount: 0,
          evidenceCount: Math.max(mergedEvidenceIds.length, merged.reduce((sum, memory) => sum + Math.max(memory.evidenceCount || 0, 1), 0), 1), evidenceMemoryIds: mergedEvidenceIds,
          supersedesMemoryId: action.memory.supersedesMemoryId, supersededByMemoryId: action.memory.supersededByMemoryId, conflictMemoryIds: action.memory.conflictMemoryIds || [],
        });
        stateModified = true;
      }
    }

    if (typeof window !== 'undefined' && (action.type as string) !== 'NO_ACTION') {
      recordLiveMemoryActivity(action, action.reason);
    }
  }
  const consolidated = consolidateMemories(currentMemories);
  const nextState = stateModified || consolidated.memories !== currentMemories ? { ...state, memories: consolidated.memories, lastMaintenanceAt: new Date().toISOString(), schemaVersion: 3 } : { ...state, schemaVersion: 3 };
  persistScratchpad(nextState.memories);
  return nextState;
}
