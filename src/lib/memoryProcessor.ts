import { MemoryAction, MemoryItem, MemoryScratchpadState } from '../types';

const ACTIVE_SCRATCHPAD_KEY = 'elara_active_scratchpad_v1';
const SCRATCHPAD_EVENT = 'elara:scratchpad-updated';

function buildPersistentScratchpad(memories: MemoryItem[]): string {
  const ranked = [...memories].sort((a, b) => {
    const importanceRank: Record<string, number> = { core: 4, important: 3, normal: 2, low: 1 };
    return (importanceRank[b.importance] || 0) - (importanceRank[a.importance] || 0);
  }).slice(0, 40);

  if (ranked.length === 0) return '';
  return ranked.map((memory) => {
    const privateTag = memory.isPrivate ? 'PRIVATE OBSERVATION' : 'SHARED FACT';
    const kind = memory.kind ? ` [${memory.kind}]` : '';
    return `- [${privateTag}] [${memory.category}]${kind} [${memory.confidence}] ${memory.content}`;
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
        kind: action.memory.kind || 'observation',
        lifecycle: action.memory.lifecycle || (action.memory.kind === 'working' ? 'working' : 'persistent'),
        source: action.memory.source || 'elara',
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
        relatedMemoryIds: action.memory.relatedMemoryIds,
        links: action.memory.links,
      };
      currentMemories.unshift(newMem);
      stateModified = true;
    } else if (action.type === 'UPDATE' && action.targetId && action.memory) {
      const index = currentMemories.findIndex((m) => m.id === action.targetId);
      if (index !== -1) {
        currentMemories[index] = {
          ...currentMemories[index],
          content: action.memory.content || currentMemories[index].content,
          kind: action.memory.kind || currentMemories[index].kind,
          lifecycle: action.memory.lifecycle || currentMemories[index].lifecycle,
          source: action.memory.source || currentMemories[index].source,
          confidence: action.memory.confidence || currentMemories[index].confidence,
          importance: action.memory.importance || currentMemories[index].importance,
          isPrivate: action.memory.isPrivate ?? currentMemories[index].isPrivate,
          category: action.memory.category || currentMemories[index].category,
          updatedAt: new Date().toISOString(),
          eventDate: action.memory.eventDate || currentMemories[index].eventDate,
          expiresAt: action.memory.expiresAt || currentMemories[index].expiresAt,
          tags: action.memory.tags || currentMemories[index].tags,
          sourceArtifactId: action.memory.sourceArtifactId || currentMemories[index].sourceArtifactId,
          relatedMemoryIds: action.memory.relatedMemoryIds || currentMemories[index].relatedMemoryIds,
          links: action.memory.links || currentMemories[index].links,
        };
        stateModified = true;
      }
    } else if (action.type === 'DELETE' && action.targetId) {
      const before = currentMemories.length;
      currentMemories = currentMemories.filter((m) => m.id !== action.targetId);
      if (currentMemories.length !== before) stateModified = true;
    } else if (action.type === 'MERGE' && action.mergeTargetIds?.length && action.memory) {
      const mergeSet = new Set(action.mergeTargetIds);
      currentMemories = currentMemories.filter((m) => !mergeSet.has(m.id));
      const now = new Date().toISOString();
      currentMemories.unshift({
        id: `mem_merged_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        content: action.memory.content,
        kind: action.memory.kind || 'observation',
        lifecycle: action.memory.lifecycle || 'persistent',
        source: action.memory.source || 'elara',
        confidence: action.memory.confidence || 'certain',
        importance: action.memory.importance || 'important',
        isPrivate: action.memory.isPrivate ?? false,
        category: action.memory.category || 'Observations',
        createdAt: now,
        updatedAt: now,
        tags: action.memory.tags || ['merged'],
        sourceConversationId: conversationId,
        sourceArtifactId: action.memory.sourceArtifactId,
        relatedMemoryIds: action.memory.relatedMemoryIds,
        links: action.memory.links,
      });
      stateModified = true;
    }
  }

  const nextState = stateModified
    ? { ...state, memories: currentMemories, lastMaintenanceAt: new Date().toISOString(), schemaVersion: state.schemaVersion || 2 }
    : state;

  persistScratchpad(nextState.memories);
  return nextState;
}
