import { WorldState } from '../types';
import { DEFAULT_WORLD_STATE } from '../constants/defaultWorldState';

const WORLD_STATE_STORAGE_KEY = 'elara_world_state_v2';

export function loadWorldState(): WorldState {
  try {
    const raw = localStorage.getItem(WORLD_STATE_STORAGE_KEY);
    if (!raw) return DEFAULT_WORLD_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_WORLD_STATE,
      ...parsed,
      house: {
        ...DEFAULT_WORLD_STATE.house,
        ...(parsed.house || {}),
      },
      liveState: {
        ...DEFAULT_WORLD_STATE.liveState,
        ...(parsed.liveState || {}),
      },
      elaraPersonalLife: {
        ...DEFAULT_WORLD_STATE.elaraPersonalLife,
        ...(parsed.elaraPersonalLife || {}),
      },
    };
  } catch (e) {
    console.error('Failed to load world state from storage:', e);
    return DEFAULT_WORLD_STATE;
  }
}

export function saveWorldState(worldState: WorldState): void {
  try {
    localStorage.setItem(WORLD_STATE_STORAGE_KEY, JSON.stringify(worldState, null, 2));
  } catch (e) {
    console.error('Failed to save world state to storage:', e);
  }
}

export function resetWorldState(): WorldState {
  try {
    localStorage.removeItem(WORLD_STATE_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to reset world state:', e);
  }
  return DEFAULT_WORLD_STATE;
}

export function exportWorldStateJSON(worldState: WorldState): void {
  const jsonStr = JSON.stringify(worldState, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `elara-world-state-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importWorldStateJSON(jsonStr: string): WorldState {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON format for world state.');
  }
  return {
    ...DEFAULT_WORLD_STATE,
    ...parsed,
  };
}
