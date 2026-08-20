import { del, get, set } from 'idb-keyval';

const DRAFTS_KEY = 'elara_composer_drafts_v1';
const DRAFT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export interface ComposerDraft {
  content: string;
  updatedAt: number;
}

type DraftMap = Record<string, ComposerDraft>;

async function readDrafts(): Promise<DraftMap> {
  const value = await get(DRAFTS_KEY);
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as DraftMap)
    : {};
}

function pruneDrafts(drafts: DraftMap, now = Date.now()): DraftMap {
  return Object.fromEntries(
    Object.entries(drafts).filter(([, draft]) => now - draft.updatedAt <= DRAFT_MAX_AGE_MS)
  );
}

export async function loadComposerDraft(conversationId: string): Promise<ComposerDraft | null> {
  if (!conversationId) return null;
  const drafts = pruneDrafts(await readDrafts());
  return drafts[conversationId] ?? null;
}

export async function saveComposerDraft(conversationId: string, content: string): Promise<void> {
  if (!conversationId) return;

  const drafts = pruneDrafts(await readDrafts());
  const next = content.length > 0
    ? { ...drafts, [conversationId]: { content, updatedAt: Date.now() } }
    : (() => {
        const copy = { ...drafts };
        delete copy[conversationId];
        return copy;
      })();

  if (Object.keys(next).length > 0) {
    await set(DRAFTS_KEY, next);
  } else {
    await del(DRAFTS_KEY);
  }
}

export async function clearComposerDraft(conversationId: string): Promise<void> {
  await saveComposerDraft(conversationId, '');
}

export async function clearAllComposerDrafts(): Promise<void> {
  await del(DRAFTS_KEY);
}
