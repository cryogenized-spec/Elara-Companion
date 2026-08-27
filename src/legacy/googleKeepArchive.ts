export interface KeepNoteItem { id: string; title: string; content: string; tags: string[]; updatedAt: string; url?: string; }

const LOCAL_KEEP_ARCHIVE_KEY = 'elara_passive_keep_archive_v1';

export function loadLocalKeepArchive(): KeepNoteItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEEP_ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalKeepArchive(notes: KeepNoteItem[]) {
  try {
    localStorage.setItem(LOCAL_KEEP_ARCHIVE_KEY, JSON.stringify(notes));
  } catch {
    // Legacy archive is best-effort only.
  }
}

export async function createKeepNote(title: string, content: string, tags: string[] = []): Promise<KeepNoteItem> {
  const note = {
    id: `keep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: title || 'Untitled Note',
    content: content || '',
    tags,
    updatedAt: new Date().toISOString(),
  };
  saveLocalKeepArchive([note, ...loadLocalKeepArchive()]);
  return note;
}

export async function searchKeepNotes(query = ''): Promise<{ notes: KeepNoteItem[] }> {
  const notes = loadLocalKeepArchive();
  if (!query.trim()) return { notes };
  const q = query.toLowerCase();
  return { notes: notes.filter((note) => note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q) || note.tags.some((tag) => tag.toLowerCase().includes(q))) };
}

export async function listKeepNotes(): Promise<{ notes: KeepNoteItem[] }> {
  return { notes: loadLocalKeepArchive() };
}

export async function getKeepNote(idOrTitle: string): Promise<KeepNoteItem | null> {
  const q = idOrTitle.toLowerCase();
  return loadLocalKeepArchive().find((note) => note.id === idOrTitle || note.title.toLowerCase() === q || note.title.toLowerCase().includes(q)) || null;
}

export async function updateKeepNote(id: string, updates: Partial<KeepNoteItem>): Promise<KeepNoteItem | null> {
  const notes = loadLocalKeepArchive();
  const index = notes.findIndex((note) => note.id === id);
  if (index < 0) return null;
  notes[index] = { ...notes[index], ...updates, updatedAt: new Date().toISOString() };
  saveLocalKeepArchive(notes);
  return notes[index];
}

export async function deleteKeepNote(id: string): Promise<boolean> {
  saveLocalKeepArchive(loadLocalKeepArchive().filter((note) => note.id !== id));
  return true;
}

export async function copyCanvasToKeep(title: string, content: string, tags: string[] = ['Canvas']) {
  return createKeepNote(title || 'Canvas Note', content, tags);
}
