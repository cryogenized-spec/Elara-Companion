import { get, set, del } from 'idb-keyval';
import { Conversation, ElaraSettings, WorldState, MemoryScratchpadState, Folder, PersonaSnapshot } from '../types';
import { DEFAULT_SETTINGS } from './storage';
import { saveActiveScratchpad } from './contextManager';

const CONVERSATIONS_KEY = 'elara_conversations_v2';
const SETTINGS_KEY = 'elara_settings_v2';
const PORTRAIT_KEY = 'elara_custom_portrait_v2';
const FOLDERS_KEY = 'elara_folders_v2';
const WORLD_STATE_KEY = 'elara_world_state_v2';
const MEMORY_STATE_KEY = 'elara_memory_state_v2';

export async function migrateFromLocalStorage() {
  const isMigrated = await get('elara_idb_migrated');
  if (isMigrated) return;
  console.log('Migrating data from localStorage to IndexedDB...');
  try {
    const rawConvs = localStorage.getItem('elara_conversations_v1');
    if (rawConvs) await set(CONVERSATIONS_KEY, JSON.parse(rawConvs));
    const rawSettings = localStorage.getItem('elara_settings_v1');
    if (rawSettings) await set(SETTINGS_KEY, JSON.parse(rawSettings));
    const rawPortrait = localStorage.getItem('elara_custom_portrait_v1');
    if (rawPortrait) await set(PORTRAIT_KEY, rawPortrait);
    const rawFolders = localStorage.getItem('elara_folders_v1');
    if (rawFolders) await set(FOLDERS_KEY, JSON.parse(rawFolders));
    const rawWorld = localStorage.getItem('elara_world_state');
    if (rawWorld) await set(WORLD_STATE_KEY, JSON.parse(rawWorld));
    const rawMemory = localStorage.getItem('elara_memory_state');
    if (rawMemory) await set(MEMORY_STATE_KEY, JSON.parse(rawMemory));
    await set('elara_idb_migrated', true);
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

export async function getDbConversations(): Promise<Conversation[]> {
  const data = await get(CONVERSATIONS_KEY);
  return Array.isArray(data) ? data : [];
}
export async function setDbConversations(data: Conversation[]) { await set(CONVERSATIONS_KEY, data); }

export async function getDbSettings(): Promise<ElaraSettings> {
  const data = await get(SETTINGS_KEY);
  return data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS;
}
export async function setDbSettings(data: ElaraSettings) { await set(SETTINGS_KEY, data); }

export async function getDbPortrait(): Promise<string | null> { return (await get(PORTRAIT_KEY)) || null; }
export async function setDbPortrait(data: string | null) { if (data) await set(PORTRAIT_KEY, data); else await del(PORTRAIT_KEY); }

export async function getDbFolders(): Promise<Folder[]> {
  const data = await get(FOLDERS_KEY);
  return Array.isArray(data) ? data : [{ id: 'default', name: 'General', isExpanded: true }];
}
export async function setDbFolders(data: Folder[]) { await set(FOLDERS_KEY, data); }

export async function getDbWorldState(): Promise<WorldState> {
  const data = await get(WORLD_STATE_KEY);
  return data || { isInitialized: false, userProfile: { name: 'User' }, relationship: { trustLevel: 0 } };
}
export async function setDbWorldState(data: WorldState) { await set(WORLD_STATE_KEY, data); }

export async function getDbMemoryState(): Promise<MemoryScratchpadState> {
  const data = await get(MEMORY_STATE_KEY);
  const state: MemoryScratchpadState = data && Array.isArray(data.memories)
    ? {
        memories: data.memories,
        lastMaintenanceAt: data.lastMaintenanceAt || new Date().toISOString(),
        autoMaintenanceEnabled: data.autoMaintenanceEnabled ?? true,
      }
    : { memories: [], lastMaintenanceAt: new Date().toISOString(), autoMaintenanceEnabled: true };

  if (state.memories.length > 0) {
    const scratchpad = [
      '[ELARA PERSISTENT SCRATCHPAD]',
      'Cross-session working memory about the user and ongoing relationship/context.',
      'Do not invent facts. Treat uncertain observations as uncertain and prefer current user statements.',
      ...state.memories.slice(0, 80).map((memory) => `- [${memory.isPrivate ? 'PRIVATE' : 'SHARED'}] [${memory.category}] [${memory.importance}/${memory.confidence}] ${memory.content}`),
      '[/ELARA PERSISTENT SCRATCHPAD]',
    ].join('\n');
    saveActiveScratchpad(scratchpad);
  }

  return state;
}
export async function setDbMemoryState(data: MemoryScratchpadState) { await set(MEMORY_STATE_KEY, data); }

export async function clearDbStorage() {
  await del(CONVERSATIONS_KEY);
  await del(SETTINGS_KEY);
  await del(PORTRAIT_KEY);
  await del(FOLDERS_KEY);
  await del(WORLD_STATE_KEY);
  await del(MEMORY_STATE_KEY);
  await del('elara_idb_migrated');
}

const SNAPSHOTS_KEY = 'elara_persona_snapshots_v1';
export async function getDbSnapshots(): Promise<PersonaSnapshot[]> {
  const data = await get(SNAPSHOTS_KEY);
  return Array.isArray(data) ? data : [];
}
export async function setDbSnapshots(data: PersonaSnapshot[]) { await set(SNAPSHOTS_KEY, data); }
