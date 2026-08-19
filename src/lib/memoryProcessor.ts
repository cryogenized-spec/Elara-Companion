import { MemoryAction, MemoryItem, MemoryScratchpadState } from '../types';

const ACTIVE_SCRATCHPAD_KEY = 'elara_active_scratchpad_v1';
const SCRATCHPAD_EVENT = 'elara:scratchpad-updated';

function buildPersistentScratchpad(memories: MemoryItem[]): string {
  const ranked = [...memories].sort((a, b) => {
    const importanceRank: Record<string, number> = { core: 4, important: 3, normal: 2, low: 1 };
    const importanceDelta = (importanceRank[b.importance] || 0) - (importanceRank[a.importance] || 0);
    if (importanceDelta !== 0) return importanceDelta;
    return (b.lastRecalledAt || b.updatedAt).localeCompare(a.lastRecalledAt || a.updatedAt);
  }).slice(0, 40);

  if (ranked.length === 0) return '';
  return ranked.map((memory) => {
    const privacy = memory.isPrivate ? 'Private note' : 'Shared note';
    const kind = memory.kind || 'context';
    const lifecycle = memory.lifecycle || 'persistent';
    return `- ${memory.content} [${privacy}; ${kind}; ${lifecycle}; ${memory.confidence}]`;
  }).join('\n');
}

function persistScratchpad(memories: MemoryItem[]): void {
  const scratchpad = buildPersistentScratchpad(memories);
  try {
    localStorage.setItem(ACTIVE_SCRATCHPAD_KEY, scratchpad);
    window.dispatchEvent(new CustomEvent(SCRATCHPAD_EVENT, { detail: { scratchpad } }));
  } catch (err) {
    console.warn('Persistent scratchpad mirror unavailable:', err);
  }
}

function applyMemoryMetadata(target: MemoryItem, action: MemoryAction, conversationId?: string): MemoryItem {
  const memory = action.memory;
  if (!memory) return target;
  return {
    ...target,
    content: memory.content || target.content,
    kind: memory.kind ?? target.kind,
    lifecycle: memory.lifecycle ?? target.lifecycle,
    source: memory.source ?? target.source ?? (conversationId ? 'conversation' : 'system'),
    confidence: memory.confidence || target.confidence,
    importance: memory.importance || target.importance,
    isPrivate: memory.isPrivate ?? target.isPrivate,
    category: memory.category || target.category,
    eventDate: memory.eventDate || target.eventDate,
    expiresAt: memory.expiresAt || target.expiresAt,
    sourceConversationId: conversationId || target.sourceConversationId,
    sourceArtifactId: memory.sourceArtifactId ?? target.sourceArtifactId,
    relatedMemoryIds: memory.relatedMemoryIds ?? target.relatedMemoryIds,
    tags: memory.tags ?? target.tags,
    links: memory.links ?? target.links,
    updatedAt: new Date().toISOString(),
  };
}

export function applyMemoryActions(
  state: MemoryScratchpadState,
  actions: MemoryAction[],
  conversationId?: string
): MemoryScratchpadState {
  if (!actions || actions.length === 0) {
    persistScratchpad(state.memories);
    return state;
  }

  let currentMemories = [...state.memories];
  let stateModified = false;

  for (const action of actions) {
    if (!action || action.type === 'NO_ACTION') continue;

    if ((action.type === 'ADD' || action.type === 'CREATE') && action.memory && action.memory.content) {
      const now = new Date().toISOString();
      const newMem: MemoryItem = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        content: action.memory.content,
        kind: action.memory.kind,
        lifecycle: action.memory.lifecycle || (action.memory.importance === 'core' ? 'core' : 'persistent'),
        source: action.memory.source || (conversationId ? 'conversation' : 'elara'),
        confidence: action.memory.confidence || 'certain',
        importance: action.memory.importance || 'normal',
        isPrivate: action.memory.isPrivate ?? true,
        category: action.memory.category || 'Observations',
        createdAt: now,
        updatedAt: now,
        eventDate: action.memory.eventDate,
        expiresAt: action.memory.expiresAt,
        pinned: false,
        tags: action.memory.tags || [],
        sourceConversationId: conversationId,
        sourceArtifactId: action.memory.sourceArtifactId,
        relatedMemoryIds: action.memory.relatedMemoryIds || [],
        links: action.memory.links || [],
        reinforcementCount: 0,
        lastRecalledAt: undefined,
      };
      currentMemories.unshift(newMem);
      stateModified = true;
    } else if (action.type === 'UPDATE' && action.targetId && action.memory) {
      const index = currentMemories.findIndex((m) => m.id === action.targetId);
      if (index !== -1) {
        currentMemories[index] = applyMemoryMetadata(currentMemories[index], action, conversationId);
        currentMemories[index].reinforcementCount = (currentMemories[index].reinforcementCount || 0) + 1;
        stateModified = true;
      }
    } else if (action.type === 'DELETE' && action.targetId) {
      const before = currentMemories.length;
      currentMemories = currentMemories.filter((m) => m.id !== action.targetId);
      if (currentMemories.length !== before) stateModified = true;
    } else if (action.type === 'MERGE' && action.mergeTargetIds?.length && action.memory) {
      const mergeSet = new Set(action.mergeTargetIds);
      const mergedSources = currentMemories.filter((m) => mergeSet.has(m.id));
      currentMemories = currentMemories.filter((m) => !mergeSet.has(m.id));
      const now = new Date().toISOString();
      currentMemories.unshift({
        id: `mem_merged_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        content: action.memory.content,
        kind: action.memory.kind || mergedSources[0]?.kind || 'context',
        lifecycle: action.memory.lifecycle || mergedSources[0]?.lifecycle || 'persistent',
        source: action.memory.source || 'elara',
        confidence: action.memory.confidence || mergedSources[0]?.confidence || 'certain',
        importance: action.memory.importance || 'important',
        isPrivate: action.memory.isPrivate ?? mergedSources.some((m) => m.isPrivate),
        category: action.memory.category || mergedSources[0]?.category || 'Observations',
        createdAt: now,
        updatedAt: now,
        eventDate: action.memory.eventDate,
        expiresAt: action.memory.expiresAt,
        pinned: false,
        tags: action.memory.tags || Array.from(new Set(mergedSources.flatMap((m) => m.tags || []))).concat('merged'),
        sourceConversationId: conversationId,
        sourceArtifactId: action.memory.sourceArtifactId,
        relatedMemoryIds: action.memory.relatedMemoryIds || mergedSources.map((m) => m.id),
        links: action.memory.links || mergedSources.flatMap((m) => m.links || []),
        reinforcementCount: mergedSources.reduce((sum, m) => sum + (m.reinforcementCount || 0), 0) + 1,
      });
      stateModified = true;
    }
  }

  const nextState = stateModified
    ? { ...state, memories: currentMemories, lastMaintenanceAt: new Date().toISOString(), schemaVersion: 2 }
    : state;

  persistScratchpad(nextState.memories);
  return nextState;
}
