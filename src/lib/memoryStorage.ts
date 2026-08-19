import { MemoryItem, MemoryKind, MemoryLifecycle, MemoryScratchpadState, MemorySource } from '../types';

const MEMORY_STORAGE_KEY = 'elara_memory_scratchpad_v1';
const MEMORY_SCHEMA_VERSION = 2;

export const DEFAULT_MEMORIES: MemoryItem[] = [];

export const DEFAULT_MEMORY_STATE: MemoryScratchpadState = {
  memories: DEFAULT_MEMORIES,
  lastMaintenanceAt: new Date().toISOString(),
  autoMaintenanceEnabled: true,
  schemaVersion: MEMORY_SCHEMA_VERSION,
};

const KIND_BY_CATEGORY: Record<MemoryItem['category'], MemoryKind> = {
  User: 'fact',
  Elara: 'fact',
  Relationship: 'relationship',
  Home: 'fact',
  Work: 'project',
  Projects: 'project',
  Preferences: 'preference',
  People: 'fact',
  Places: 'fact',
  Experiences: 'episode',
  Observations: 'observation',
  Plans: 'plan',
  Other: 'context',
};

const isMemoryKind = (value: unknown): value is MemoryKind =>
  ['fact', 'preference', 'observation', 'episode', 'project', 'relationship', 'plan', 'working', 'context'].includes(value as string);

const isMemoryLifecycle = (value: unknown): value is MemoryLifecycle =>
  ['working', 'contextual', 'persistent', 'core', 'archived'].includes(value as string);

const isMemorySource = (value: unknown): value is MemorySource =>
  ['user', 'elara', 'conversation', 'artifact', 'system', 'imported'].includes(value as string);

/** Normalize legacy memory records into the Pass 1 canonical schema. */
export function normalizeMemoryItem(value: unknown): MemoryItem | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<MemoryItem>;
  if (typeof raw.id !== 'string' || typeof raw.content !== 'string') return null;
  if (typeof raw.confidence !== 'string' || typeof raw.importance !== 'string') return null;
  if (typeof raw.isPrivate !== 'boolean' || typeof raw.category !== 'string') return null;
  if (typeof raw.createdAt !== 'string' || typeof raw.updatedAt !== 'string') return null;

  const kind = isMemoryKind(raw.kind) ? raw.kind : KIND_BY_CATEGORY[raw.category as MemoryItem['category']] || 'context';
  const lifecycle = isMemoryLifecycle(raw.lifecycle)
    ? raw.lifecycle
    : raw.importance === 'core'
      ? 'core'
      : 'persistent';
  const source = isMemorySource(raw.source)
    ? raw.source
    : raw.sourceArtifactId
      ? 'artifact'
      : raw.sourceConversationId
        ? 'conversation'
        : 'system';

  return {
    ...raw,
    kind,
    lifecycle,
    source,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    relatedMemoryIds: Array.isArray(raw.relatedMemoryIds)
      ? raw.relatedMemoryIds.filter((id): id is string => typeof id === 'string')
      : [],
    links: Array.isArray(raw.links)
      ? raw.links.filter((link) => link && typeof link === 'object' && typeof link.type === 'string' && typeof link.id === 'string')
      : [],
    reinforcementCount: typeof raw.reinforcementCount === 'number' && raw.reinforcementCount >= 0 ? raw.reinforcementCount : 0,
    pinned: raw.pinned ?? false,
  } as MemoryItem;
}

export function normalizeMemoryState(value: unknown): MemoryScratchpadState {
  if (!value || typeof value !== 'object') return { ...DEFAULT_MEMORY_STATE, memories: [] };
  const raw = value as Partial<MemoryScratchpadState>;
  const memories = Array.isArray(raw.memories)
    ? raw.memories.map(normalizeMemoryItem).filter(Boolean) as MemoryItem[]
    : [];

  return {
    memories,
    lastMaintenanceAt: typeof raw.lastMaintenanceAt === 'string' ? raw.lastMaintenanceAt : new Date().toISOString(),
    autoMaintenanceEnabled: raw.autoMaintenanceEnabled ?? true,
    schemaVersion: MEMORY_SCHEMA_VERSION,
  };
}

export function loadMemoryState(): MemoryScratchpadState {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) return DEFAULT_MEMORY_STATE;
    return normalizeMemoryState(JSON.parse(raw));
  } catch (err) {
    console.error('Failed to load memory state from localStorage', err);
  }
  return DEFAULT_MEMORY_STATE;
}

export function saveMemoryState(state: MemoryScratchpadState): void {
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(normalizeMemoryState(state)));
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
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(normalizeMemoryState(state), null, 2));
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
  return normalizeMemoryState(parsed);
}
