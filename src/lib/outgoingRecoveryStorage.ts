import { del, get, set } from 'idb-keyval';

const OUTBOX_KEY = 'elara_outgoing_recovery_v1';
const MAX_ENTRIES = 10;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type OutgoingRecoveryStatus = 'pending' | 'confirmed' | 'failed';

export interface OutgoingRecoveryEntry {
  id: string;
  content: string;
  image?: string;
  conversationFingerprint: string;
  createdAt: number;
  updatedAt: number;
  status: OutgoingRecoveryStatus;
  messageId?: string;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `out_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function readEntries(): Promise<OutgoingRecoveryEntry[]> {
  const value = await get(OUTBOX_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is OutgoingRecoveryEntry => Boolean(
    entry &&
    typeof entry.id === 'string' &&
    typeof entry.content === 'string' &&
    typeof entry.createdAt === 'number' &&
    typeof entry.updatedAt === 'number' &&
    typeof entry.status === 'string',
  ));
}

function prune(entries: OutgoingRecoveryEntry[], now = Date.now()): OutgoingRecoveryEntry[] {
  return entries
    .filter((entry) => now - entry.updatedAt <= MAX_AGE_MS)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_ENTRIES);
}

async function writeEntries(entries: OutgoingRecoveryEntry[]): Promise<void> {
  const next = prune(entries);
  if (next.length > 0) await set(OUTBOX_KEY, next);
  else await del(OUTBOX_KEY);
}

export async function listOutgoingRecoveryEntries(): Promise<OutgoingRecoveryEntry[]> {
  const entries = prune(await readEntries());
  await writeEntries(entries);
  return entries;
}

export async function createPendingOutgoingRecovery(input: {
  content: string;
  image?: string;
  conversationFingerprint: string;
}): Promise<OutgoingRecoveryEntry> {
  const now = Date.now();
  const entry: OutgoingRecoveryEntry = {
    id: createId(),
    content: input.content,
    image: input.image,
    conversationFingerprint: input.conversationFingerprint,
    createdAt: now,
    updatedAt: now,
    status: 'pending',
  };
  const entries = await readEntries();
  await writeEntries([entry, ...entries]);
  return entry;
}

async function updateEntry(id: string, patch: Partial<OutgoingRecoveryEntry>): Promise<void> {
  const entries = await readEntries();
  const next = entries.map((entry) => entry.id === id ? { ...entry, ...patch, updatedAt: Date.now() } : entry);
  await writeEntries(next);
}

export function markOutgoingConfirmed(id: string, messageId?: string): Promise<void> {
  return updateEntry(id, { status: 'confirmed', messageId });
}

export function markOutgoingFailed(id: string): Promise<void> {
  return updateEntry(id, { status: 'failed' });
}

export async function clearOutgoingRecoveryEntry(id: string): Promise<void> {
  const entries = await readEntries();
  await writeEntries(entries.filter((entry) => entry.id !== id));
}

export async function clearAllOutgoingRecovery(): Promise<void> {
  await del(OUTBOX_KEY);
}

export function normalizeRecoveryText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
