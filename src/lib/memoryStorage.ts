import { MemoryItem, MemoryScratchpadState } from '../types';

const MEMORY_STORAGE_KEY = 'elara_memory_scratchpad_v1';

export const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'mem_default_1',
    content: "I've noticed [[user]] has a habit of leaving a project half-disassembled when he becomes interested in another problem. He usually comes back to it eventually once the fresh idea settles.",
    confidence: 'likely',
    importance: 'normal',
    isPrivate: true,
    category: 'Work',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    pinned: true,
    tags: ['work habits', 'focus', 'projects'],
  },
  {
    id: 'mem_default_2',
    content: "He's particularly amused by dry, absurd humour rather than obvious punchlines. Subtle deadpan observations usually draw a real laugh.",
    confidence: 'likely',
    importance: 'normal',
    isPrivate: true,
    category: 'Preferences',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    pinned: false,
    tags: ['humour', 'communication'],
  },
  {
    id: 'mem_default_3',
    content: "[[user]] mentioned wanting to revisit the idea of building a small local AI server in the workshop to run self-hosted instruments.",
    confidence: 'certain',
    importance: 'important',
    isPrivate: false,
    category: 'Projects',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    pinned: true,
    tags: ['workshop', 'AI server', 'hardware'],
  },
  {
    id: 'mem_default_4',
    content: "The blue stoneware mug in the kitchen is the one he always reaches for despite insisting he doesn't have a favourite mug.",
    confidence: 'likely',
    importance: 'low',
    isPrivate: true,
    category: 'Preferences',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    pinned: false,
    tags: ['kitchen', 'habits'],
  },
  {
    id: 'mem_default_5',
    content: "I've developed a genuine fondness for old mechanical clocks and precision brass gearwork. Something about their physical cadence feels reassuring.",
    confidence: 'certain',
    importance: 'core',
    isPrivate: true,
    category: 'Elara',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    pinned: true,
    tags: ['identity', 'interests'],
  },
  {
    id: 'mem_default_6',
    content: "We spent time together working through the workshop setup recently. He seemed remarkably content when we got the main workstation diagnostic test running without errors.",
    confidence: 'certain',
    importance: 'important',
    isPrivate: false,
    category: 'Experiences',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    pinned: false,
    tags: ['workshop', 'shared memories'],
  },
];

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
