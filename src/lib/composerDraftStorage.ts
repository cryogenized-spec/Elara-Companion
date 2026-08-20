import { del, get, set } from 'idb-keyval';

const DRAFTS_KEY = 'elara_composer_drafts_v1';

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

export async function loadComposerDraft(conversationId: string): Promise<ComposerDraft | null> {
  if (!conversationId) return null;
  const drafts = await readDrafts();
  return drafts[conversationId] ?? null;
}

export async function saveComposerDraft(conversationId: string, content: string): Promise<void> {
  if (!conversationId) return;

  const drafts = await readDrafts();
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
