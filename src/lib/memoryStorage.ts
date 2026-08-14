import { MemoryItem, MemoryScratchpadState } from '../types';

const MEMORY_STORAGE_KEY = 'elara_memory_scratchpad_v1';

export const DEFAULT_MEMORIES: MemoryItem[] = [];

export const DEFAULT_MEMORY_STATE: MemoryScratchpadState = {
  memories: DEFAULT_MEMORIES,
  lastMaintenanceAt: new Date().toISOString(),
  autoMaintenanceEnabled: true,
};

export function loadMemoryState(): MemoryScratchpadState {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) return DEFAULT_MEMORY_STATE;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.memories)) {
      return {
        memories: parsed.memories,
        lastMaintenanceAt: parsed.lastMaintenanceAt || new Date().toISOString(),
        autoMaintenanceEnabled: parsed.autoMaintenanceEnabled ?? true,
      };
    }
  } catch (err) {
    console.error('Failed to load memory state from localStorage', err);
  }
  return DEFAULT_MEMORY_STATE;
}

export function saveMemoryState(state: MemoryScratchpadState): void {
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save memory state to localStorage', err);
  }
}

export function resetMemoryState(): MemoryScratchpadState {
  try {
    localStorage.removeItem(MEMORY_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear memory state', err);
  }
  return DEFAULT_MEMORY_STATE;
}

export function exportMemoryJSON(state: MemoryScratchpadState): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `elara_memory_scratchpad_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function importMemoryJSON(jsonString: string): MemoryScratchpadState {
  const parsed = JSON.parse(jsonString);
  if (!parsed || !Array.isArray(parsed.memories)) {
    throw new Error('Invalid memory JSON structure');
  }
  return {
    memories: parsed.memories,
    lastMaintenanceAt: parsed.lastMaintenanceAt || new Date().toISOString(),
    autoMaintenanceEnabled: parsed.autoMaintenanceEnabled ?? true,
  };
}
