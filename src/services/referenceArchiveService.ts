export interface ReferenceNoteItem { id: string; title: string; content: string; tags: string[]; updatedAt: string; url?: string; }

// Preserve the historical storage key so deleting the legacy implementation does not orphan existing local data.
const LOCAL_REFERENCE_ARCHIVE_KEY = 'elara_passive_keep_archive_v1';

export function loadLocalReferenceArchive(): ReferenceNoteItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_REFERENCE_ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalReferenceArchive(notes: ReferenceNoteItem[]) {
  try {
    localStorage.setItem(LOCAL_REFERENCE_ARCHIVE_KEY, JSON.stringify(notes));
  } catch {
    // Historical local archive is best-effort only.
  }
}

export async function createReferenceNote(title: string, content: string, tags: string[] = []): Promise<ReferenceNoteItem> {
  const note = {
    id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: title || 'Untitled Note',
    content: content || '',
    tags,
    updatedAt: new Date().toISOString(),
  };
  saveLocalReferenceArchive([note, ...loadLocalReferenceArchive()]);
  return note;
}

export async function searchReferenceNotes(query = ''): Promise<{ notes: ReferenceNoteItem[] }> {
  const notes = loadLocalReferenceArchive();
  if (!query.trim()) return { notes };
  const q = query.toLowerCase();
  return { notes: notes.filter((note) => note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q) || note.tags.some((tag) => tag.toLowerCase().includes(q))) };
}

export async function listReferenceNotes(): Promise<{ notes: ReferenceNoteItem[] }> {
  return { notes: loadLocalReferenceArchive() };
}

export async function getReferenceNote(idOrTitle: string): Promise<ReferenceNoteItem | null> {
  const q = idOrTitle.toLowerCase();
  return loadLocalReferenceArchive().find((note) => note.id === idOrTitle || note.title.toLowerCase() === q || note.title.toLowerCase().includes(q)) || null;
}

export async function updateReferenceNote(id: string, updates: Partial<ReferenceNoteItem>): Promise<ReferenceNoteItem | null> {
  const notes = loadLocalReferenceArchive();
  const index = notes.findIndex((note) => note.id === id);
  if (index < 0) return null;
  notes[index] = { ...notes[index], ...updates, updatedAt: new Date().toISOString() };
  saveLocalReferenceArchive(notes);
  return notes[index];
}

export async function deleteReferenceNote(id: string): Promise<boolean> {
  saveLocalReferenceArchive(loadLocalReferenceArchive().filter((note) => note.id !== id));
  return true;
}

export async function copyCanvasToReference(title: string, content: string, tags: string[] = ['Canvas']) {
  return createReferenceNote(title || 'Canvas Note', content, tags);
}
