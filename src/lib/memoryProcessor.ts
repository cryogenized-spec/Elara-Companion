import { MemoryAction, MemoryItem, MemoryScratchpadState } from '../types';

export function applyMemoryActions(
  state: MemoryScratchpadState,
  actions: MemoryAction[],
  conversationId?: string
): MemoryScratchpadState {
  if (!actions || actions.length === 0) return state;

  let currentMemories = [...state.memories];
  let stateModified = false;

  for (const action of actions) {
    if (!action || action.type === 'NO_ACTION') continue;

    if (action.type === 'ADD' && action.memory && action.memory.content) {
      const newMem: MemoryItem = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        content: action.memory.content,
        confidence: action.memory.confidence || 'certain',
        importance: action.memory.importance || 'normal',
        isPrivate: action.memory.isPrivate ?? true,
        category: action.memory.category || 'Observations',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        eventDate: action.memory.eventDate,
        pinned: false,
        tags: action.memory.tags || [],
        sourceConversationId: conversationId,
      };
      currentMemories.unshift(newMem);
      stateModified = true;
    } else if (action.type === 'UPDATE' && action.targetId && action.memory) {
      const index = currentMemories.findIndex((m) => m.id === action.targetId);
      if (index !== -1) {
        currentMemories[index] = {
          ...currentMemories[index],
          content: action.memory.content || currentMemories[index].content,
          confidence: action.memory.confidence || currentMemories[index].confidence,
          importance: action.memory.importance || currentMemories[index].importance,
          isPrivate: action.memory.isPrivate ?? currentMemories[index].isPrivate,
          category: action.memory.category || currentMemories[index].category,
          updatedAt: new Date().toISOString(),
          eventDate: action.memory.eventDate || currentMemories[index].eventDate,
          tags: action.memory.tags || currentMemories[index].tags,
        };
        stateModified = true;
      }
    } else if (action.type === 'DELETE' && action.targetId) {
      const initialLength = currentMemories.length;
      currentMemories = currentMemories.filter((m) => m.id !== action.targetId);
      if (currentMemories.length !== initialLength) {
        stateModified = true;
      }
    } else if (action.type === 'MERGE' && action.mergeTargetIds && action.mergeTargetIds.length > 0 && action.memory) {
      const mergeSet = new Set(action.mergeTargetIds);
      currentMemories = currentMemories.filter((m) => !mergeSet.has(m.id));

      const mergedMem: MemoryItem = {
        id: `mem_merged_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        content: action.memory.content,
        confidence: action.memory.confidence || 'certain',
        importance: action.memory.importance || 'important',
        isPrivate: action.memory.isPrivate ?? false,
        category: action.memory.category || 'Observations',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: action.memory.tags || ['merged'],
        sourceConversationId: conversationId,
      };
      currentMemories.unshift(mergedMem);
      stateModified = true;
    }
  }

  if (!stateModified) return state;

  return {
    ...state,
    memories: currentMemories,
    lastMaintenanceAt: new Date().toISOString(),
  };
}
