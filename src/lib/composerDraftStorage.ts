import { del, get, set } from 'idb-keyval';

const DRAFTS_KEY = 'elara_composer_drafts_v1';
const PREFS_KEY = 'elara_composer_draft_prefs_v1';

export interface ComposerDraftPreferences {
  enabled: boolean;
  maxAgeDays: number;
}

const DEFAULT_DRAFT_PREFERENCES: ComposerDraftPreferences = {
  enabled: true,
  maxAgeDays: 30,
};

export interface ComposerDraft {
  content: string;
  updatedAt: number;
}

type DraftMap = Record<string, ComposerDraft>;

export function getComposerDraftPreferences(reset = false): ComposerDraftPreferences {
  if (typeof window === 'undefined' || reset) return { ...DEFAULT_DRAFT_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_DRAFT_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<ComposerDraftPreferences>;
    return {
      enabled: parsed.enabled !== false,
      maxAgeDays: [7, 30, 90].includes(Number(parsed.maxAgeDays)) ? Number(parsed.maxAgeDays) : DEFAULT_DRAFT_PREFERENCES.maxAgeDays,
    };
  } catch {
    return { ...DEFAULT_DRAFT_PREFERENCES };
  }
}

export function saveComposerDraftPreferences(preferences: ComposerDraftPreferences): void {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({
      enabled: preferences.enabled !== false,
      maxAgeDays: [7, 30, 90].includes(Number(preferences.maxAgeDays)) ? Number(preferences.maxAgeDays) : 30,
    }));
  } catch {
    // Persistence is best-effort; the editor remains usable when storage is unavailable.
  }
}

async function readDrafts(): Promise<DraftMap> {
  const value = await get(DRAFTS_KEY);
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as DraftMap)
    : {};
}

function pruneDrafts(drafts: DraftMap, now = Date.now()): DraftMap {
  const maxAgeMs = getComposerDraftPreferences().maxAgeDays * 24 * 60 * 60 * 1000;
  return Object.fromEntries(
    Object.entries(drafts).filter(([, draft]) => now - draft.updatedAt <= maxAgeMs),
  );
}

export async function loadComposerDraft(conversationId: string): Promise<ComposerDraft | null> {
  if (!conversationId || !getComposerDraftPreferences().enabled) return null;
  const drafts = pruneDrafts(await readDrafts());
  return drafts[conversationId] ?? null;
}

export async function saveComposerDraft(conversationId: string, content: string): Promise<void> {
  if (!conversationId || !getComposerDraftPreferences().enabled) return;

  const drafts = pruneDrafts(await readDrafts());
  const next = content.length > 0
    ? { ...drafts, [conversationId]: { content, updatedAt: Date.now() } }
    : (() => {
        const copy = { ...drafts };
        delete copy[conversationId];
        return copy;
      })();

  if (Object.keys(next).length > 0) await set(DRAFTS_KEY, next);
  else await del(DRAFTS_KEY);
}

export async function clearComposerDraft(conversationId: string): Promise<void> {
  await saveComposerDraft(conversationId, '');
}

export async function clearAllComposerDrafts(): Promise<void> {
  await del(DRAFTS_KEY);
}
