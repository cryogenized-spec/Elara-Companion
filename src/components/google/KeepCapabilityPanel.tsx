import React, { useState } from 'react';
import { createGoogleKeepNote, deleteGoogleKeepNote, listGoogleKeepNotes, type GoogleKeepNote } from '../../services/googleKeepService';

export function KeepCapabilityPanel({ canRead, canWrite, onActivity }: { canRead: boolean; canWrite: boolean; onActivity?: (description: string, reversible?: boolean) => void }) {
  const [notes, setNotes] = useState<GoogleKeepNote[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    if (!canRead) return;
    setLoading(true); setError(null);
    try { const result = await listGoogleKeepNotes(20); setNotes(result.notes.filter(note => !note.trashed)); onActivity?.(`Read ${result.notes.length} Google Keep note${result.notes.length === 1 ? '' : 's'}`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to read Google Keep.'); }
    finally { setLoading(false); }
  };
  const create = async () => {
    if (!canWrite || !title.trim()) return;
    setError(null);
    try { const note = await createGoogleKeepNote(title.trim(), content); setNotes(prev => [note, ...prev]); setTitle(''); setContent(''); onActivity?.(`Created Google Keep note “${note.title}”`, true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to create Google Keep note.'); }
  };
  const remove = async (note: GoogleKeepNote) => {
    if (!canWrite) return;
    setError(null);
    try { await deleteGoogleKeepNote(note.name); setNotes(prev => prev.filter(item => item.name !== note.name)); onActivity?.(`Deleted Google Keep note “${note.title}”`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete Google Keep note.'); }
  };
  return <div className="space-y-5"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">Notes</p><h3 className="mt-1 text-lg font-semibold">Google Keep</h3><p className="mt-1 text-sm text-white/50">Use Google Keep as the external notes store; Elara keeps only the state needed to operate it.</p></div>{!canRead ? <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">Google Keep read access is not enabled.</div> : <><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/[0.06]">{loading ? 'Loading…' : 'Refresh notes'}</button><a href="https://keep.google.com/" target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/[0.06]">Open Keep</a></div>{canWrite && <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"/><textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Note content" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"/><button type="button" onClick={() => void create()} disabled={!title.trim()} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium disabled:opacity-40">Create note</button></section>}{error && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{error}</div>}<div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">{notes.length === 0 ? <div className="px-4 py-8 text-center text-sm text-white/35">No notes loaded yet.</div> : notes.map(note => <article key={note.name} className="flex items-start gap-3 px-4 py-4"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{note.title || '(Untitled)'}</p><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-white/50">{note.content}</p>{note.updateTime && <p className="mt-2 text-[11px] text-white/30">Updated {new Date(note.updateTime).toLocaleString()}</p>}</div>{canWrite && <button type="button" onClick={() => void remove(note)} className="rounded-lg border border-red-400/15 px-2.5 py-2 text-xs text-red-200 hover:bg-red-400/[0.06]">Delete</button>}</article>)}</div></>}</div>;
}
