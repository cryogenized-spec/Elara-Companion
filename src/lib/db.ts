import { get, set, del } from 'idb-keyval';
import { Conversation, ElaraSettings, WorldState, MemoryScratchpadState, Folder, PersonaSnapshot } from '../types';
import { DEFAULT_SETTINGS, normalizeSettings } from './storage';
import { loadAgentOperatingPolicy, saveAgentOperatingPolicy, AGENT_OPERATING_POLICY_KEY } from './agentPolicy';
import { saveActiveScratchpad, clearActiveScratchpad, clearUserProfileNotes, USER_PROFILE_NOTES_KEY, ACTIVE_SCRATCHPAD_KEY } from './contextManager';
import { clearWorkspace } from './workspaceStorage';
import { DEFAULT_WORLD_STATE } from '../constants/defaultWorldState';
import { applySettingsAppearance } from './themeManager';

const CONVERSATIONS_KEY = 'elara_conversations_v2';
const SETTINGS_KEY = 'elara_settings_v2';
const PORTRAIT_KEY = 'elara_custom_portrait_v2';
const FOLDERS_KEY = 'elara_folders_v2';
const WORLD_STATE_KEY = 'elara_world_state_v2';
const MEMORY_STATE_KEY = 'elara_memory_state_v2';
const SNAPSHOTS_KEY = 'elara_persona_snapshots_v1';
const MIGRATION_KEY = 'elara_idb_migrated';

const LEGACY_KEYS = [
  'elara_conversations_v1',
  'elara_settings_v1',
  'elara_custom_portrait_v1',
  'elara_folders_v1',
  'elara_world_state',
  'elara_memory_state',
];

function getLocalStorage(): Storage | null {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function readLegacy(key: string): string | null {
  try { return getLocalStorage()?.getItem(key) ?? null; } catch { return null; }
}

async function migrateValue(idbKey: string, legacyKey: string, transform: (value: unknown) => unknown = (value) => value): Promise<boolean> {
  const raw = readLegacy(legacyKey);
  if (!raw) return false;
  try {
    await set(idbKey, transform(JSON.parse(raw)));
    return true;
  } catch (error) {
    console.error(`Failed to migrate ${legacyKey}:`, error);
    return false;
  }
}

export async function migrateFromLocalStorage(): Promise<{ migrated: boolean; failures: string[] }> {
  const isMigrated = await get(MIGRATION_KEY);
  if (isMigrated) return { migrated: false, failures: [] };

  console.log('Migrating data from localStorage to IndexedDB...');
  const failures: string[] = [];
  const migrations: Array<[string, string, ((value: unknown) => unknown) | undefined]> = [
    [CONVERSATIONS_KEY, 'elara_conversations_v1', (value) => Array.isArray(value) ? value : []],
    [SETTINGS_KEY, 'elara_settings_v1', (value) => value && typeof value === 'object' ? normalizeSettings(value as Partial<ElaraSettings>) : DEFAULT_SETTINGS],
    [PORTRAIT_KEY, 'elara_custom_portrait_v1', undefined],
    [FOLDERS_KEY, 'elara_folders_v1', (value) => Array.isArray(value) ? value : []],
    [WORLD_STATE_KEY, 'elara_world_state', (value) => value && typeof value === 'object' ? value : DEFAULT_WORLD_STATE],
    [MEMORY_STATE_KEY, 'elara_memory_state', (value) => value && typeof value === 'object' ? value : { memories: [] }],
  ];

  for (const [idbKey, legacyKey, transform] of migrations) {
    const migrated = await migrateValue(idbKey, legacyKey, transform);
    if (!migrated && readLegacy(legacyKey)) failures.push(legacyKey);
  }

  if (failures.length === 0) {
    await set(MIGRATION_KEY, true);
    console.log('Migration complete.');
  } else {
    console.warn('Migration completed with recoverable failures:', failures);
  }

  return { migrated: failures.length === 0, failures };
}

export async function getDbConversations(): Promise<Conversation[]> {
  const data = await get(CONVERSATIONS_KEY);
  return Array.isArray(data) ? data : [];
}
export async function setDbConversations(data: Conversation[]) { await set(CONVERSATIONS_KEY, Array.isArray(data) ? data : []); }

export async function getDbSettings(): Promise<ElaraSettings> {
  const data = await get(SETTINGS_KEY);
  const settings = normalizeSettings(data && typeof data === 'object' ? data as Partial<ElaraSettings> : DEFAULT_SETTINGS);

  const legacyPolicy = data && typeof data === 'object' && typeof (data as any).agentBehaviorPolicy === 'string'
    ? String((data as any).agentBehaviorPolicy).trim()
    : '';
  if (legacyPolicy) saveAgentOperatingPolicy(legacyPolicy);
  else loadAgentOperatingPolicy();

  applySettingsAppearance(settings);
  return settings;
}

export async function setDbSettings(data: ElaraSettings) {
  const normalized = normalizeSettings(data);
  await set(SETTINGS_KEY, normalized);
  applySettingsAppearance(normalized);
}

export async function getDbPortrait(): Promise<string | null> { return (await get(PORTRAIT_KEY)) || null; }
export async function setDbPortrait(data: string | null) { if (data) await set(PORTRAIT_KEY, data); else await del(PORTRAIT_KEY); }

export async function getDbFolders(): Promise<Folder[]> {
  const data = await get(FOLDERS_KEY);
  return Array.isArray(data) && data.length > 0 ? data : [{ id: 'default', name: 'General', isExpanded: true }];
}
export async function setDbFolders(data: Folder[]) { await set(FOLDERS_KEY, Array.isArray(data) ? data : []); }

export async function getDbWorldState(): Promise<WorldState> {
  const data = await get(WORLD_STATE_KEY);
  return data && typeof data === 'object' ? { ...DEFAULT_WORLD_STATE, ...data } as WorldState : { ...DEFAULT_WORLD_STATE };
}
export async function setDbWorldState(data: WorldState) { await set(WORLD_STATE_KEY, data); }

export async function getDbMemoryState(): Promise<MemoryScratchpadState> {
  const data = await get(MEMORY_STATE_KEY);
  const state: MemoryScratchpadState = data && Array.isArray((data as any).memories)
    ? {
        memories: (data as any).memories,
        lastMaintenanceAt: (data as any).lastMaintenanceAt || new Date().toISOString(),
        autoMaintenanceEnabled: (data as any).autoMaintenanceEnabled ?? true,
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
  await Promise.all([
    del(CONVERSATIONS_KEY),
    del(SETTINGS_KEY),
    del(PORTRAIT_KEY),
    del(FOLDERS_KEY),
    del(WORLD_STATE_KEY),
    del(MEMORY_STATE_KEY),
    del(SNAPSHOTS_KEY),
    del(MIGRATION_KEY),
  ]);

  clearWorkspace();
  clearActiveScratchpad();
  clearUserProfileNotes();
  try {
    const storage = getLocalStorage();
    LEGACY_KEYS.forEach((key) => storage?.removeItem(key));
    storage?.removeItem(AGENT_OPERATING_POLICY_KEY);
    storage?.removeItem(USER_PROFILE_NOTES_KEY);
    storage?.removeItem(ACTIVE_SCRATCHPAD_KEY);
  } catch (error) {
    console.error('Failed to clear browser persistence:', error);
  }
}

export async function getDbSnapshots(): Promise<PersonaSnapshot[]> {
  const data = await get(SNAPSHOTS_KEY);
  return Array.isArray(data) ? data : [];
}
export async function setDbSnapshots(data: PersonaSnapshot[]) { await set(SNAPSHOTS_KEY, Array.isArray(data) ? data : []); }
