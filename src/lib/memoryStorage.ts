import { MemoryItem, MemoryKind, MemoryLifecycle, MemoryScratchpadState, MemorySource, MemoryConfidence, MemoryImportance, MemoryCategory, MemoryResolution, MemoryState } from '../types';

const MEMORY_STORAGE_KEY = 'elara_memory_scratchpad_v1';
const MEMORY_SCHEMA_VERSION = 3;

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

const isMemoryConfidence = (value: unknown): value is MemoryConfidence =>
  ['certain', 'likely', 'uncertain'].includes(value as string);

const isMemoryImportance = (value: unknown): value is MemoryImportance =>
  ['low', 'normal', 'important', 'core'].includes(value as string);

const isMemoryCategory = (value: unknown): value is MemoryCategory =>
  ['User', 'Elara', 'Relationship', 'Home', 'Work', 'Projects', 'Preferences', 'People', 'Places', 'Experiences', 'Observations', 'Plans', 'Other'].includes(value as string);

const isMemoryResolution = (value: unknown): value is MemoryResolution =>
  ['core', 'contextual', 'episodic', 'observation', 'synthesized'].includes(value as string);

const isMemoryState = (value: unknown): value is MemoryState =>
  ['active', 'stale', 'archived', 'superseded', 'conflicted'].includes(value as string);

const normalizeLegacyConfidence = (value: unknown): MemoryConfidence => {
  if (isMemoryConfidence(value)) return value;
  if (value === 'high') return 'certain';
  if (value === 'medium') return 'likely';
  return 'uncertain';
};

const normalizeLegacyImportance = (value: unknown): MemoryImportance => {
  if (isMemoryImportance(value)) return value;
  if (value === 'high') return 'important';
  if (value === 'medium') return 'normal';
  if (value === 'low') return 'low';
  return 'normal';
};

const deriveResolution = (kind: MemoryKind, lifecycle: MemoryLifecycle, explicit?: unknown): MemoryResolution => {
  if (isMemoryResolution(explicit)) return explicit;
  if (lifecycle === 'core') return 'core';
  if (kind === 'observation') return 'observation';
  if (kind === 'episode') return 'episodic';
  if (kind === 'fact' || kind === 'preference' || kind === 'relationship' || kind === 'project' || kind === 'plan' || kind === 'working' || kind === 'context') return 'contextual';
  return 'observation';
};

/** Normalize legacy memory records into the Pass 1 canonical schema. */
export function normalizeMemoryItem(value: unknown): MemoryItem | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<MemoryItem> & { confidence?: unknown; importance?: unknown; category?: unknown; resolution?: unknown; state?: unknown };
  if (typeof raw.id !== 'string' || typeof raw.content !== 'string') return null;
  if (typeof raw.isPrivate !== 'boolean') return null;
  if (typeof raw.createdAt !== 'string' || typeof raw.updatedAt !== 'string') return null;

  const category = isMemoryCategory(raw.category) ? raw.category : 'Observations';
  const kind = isMemoryKind(raw.kind) ? raw.kind : KIND_BY_CATEGORY[category] || 'context';
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
  const confidence = normalizeLegacyConfidence(raw.confidence);
  const importance = normalizeLegacyImportance(raw.importance);
  const resolution = deriveResolution(kind, lifecycle, raw.resolution);
  const state = isMemoryState(raw.state) ? raw.state : lifecycle === 'archived' ? 'archived' : 'active';
  const retrievalCount = typeof raw.retrievalCount === 'number' && raw.retrievalCount >= 0 ? raw.retrievalCount : 0;
  const evidenceCount = typeof raw.evidenceCount === 'number' && raw.evidenceCount >= 0 ? raw.evidenceCount : 0;

  return {
    ...raw,
    kind,
    lifecycle,
    source,
    confidence,
    importance,
    category,
    resolution,
    state,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    relatedMemoryIds: Array.isArray(raw.relatedMemoryIds)
      ? raw.relatedMemoryIds.filter((id): id is string => typeof id === 'string')
      : [],
    links: Array.isArray(raw.links)
      ? raw.links.filter((link) => link && typeof link === 'object' && typeof link.type === 'string' && typeof link.id === 'string')
      : [],
    evidenceMemoryIds: Array.isArray(raw.evidenceMemoryIds)
      ? raw.evidenceMemoryIds.filter((id): id is string => typeof id === 'string')
      : [],
    conflictMemoryIds: Array.isArray(raw.conflictMemoryIds)
      ? raw.conflictMemoryIds.filter((id): id is string => typeof id === 'string')
      : [],
    reinforcementCount: typeof raw.reinforcementCount === 'number' && raw.reinforcementCount >= 0 ? raw.reinforcementCount : 0,
    retrievalCount,
    evidenceCount,
    pinned: Boolean(raw.pinned),
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
    console.error('Failed to save memory state', err);
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
