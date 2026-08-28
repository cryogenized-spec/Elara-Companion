import React, { useState } from 'react';
import { createGoogleDoc, editGoogleDoc, getGoogleDoc, searchGoogleDriveDocs, type GoogleDocSummary } from '../../services/googleDocsDriveService';

export interface DocsCapabilityPanelProps { canUse: boolean; onActivity?: (description: string, reversible?: boolean) => void; }

export function DocsCapabilityPanel({ canUse, onActivity }: DocsCapabilityPanelProps) {
  const [query, setQuery] = useState('');
  const [docs, setDocs] = useState<GoogleDocSummary[]>([]);
  const [selected, setSelected] = useState<{ documentId: string; title: string; content: string; url: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [appendText, setAppendText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const search = async () => { if (!canUse) return; setLoading(true); setError(null); try { const result = await searchGoogleDriveDocs(query, 10); setDocs(result.docs); onActivity?.(`Listed ${result.docs.length} Google Docs document${result.docs.length === 1 ? '' : 's'}`); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to search Docs.'); } finally { setLoading(false); } };
  const open = async (doc: GoogleDocSummary) => { setLoading(true); setError(null); try { setSelected(await getGoogleDoc(doc.id)); onActivity?.(`Opened Google Doc “${doc.title}”`); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to open document.'); } finally { setLoading(false); } };
  const create = async () => { if (!canUse || !newTitle.trim()) return; setError(null); try { const result = await createGoogleDoc(newTitle.trim(), newContent); setNotice(`Created “${result.title}”.`); setNewTitle(''); setNewContent(''); onActivity?.(`Created Google Doc “${result.title}”`, true); setSelected(result); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create document.'); } };
  const append = async () => { if (!selected || !appendText.trim()) return; setError(null); try { await editGoogleDoc(selected.documentId, appendText, 'append'); setSelected(await getGoogleDoc(selected.documentId)); setAppendText(''); setNotice('Document updated.'); onActivity?.(`Updated Google Doc “${selected.title}”`, true); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update document.'); } };

  return <div className="space-y-5"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">Documents</p><h3 className="mt-1 text-lg font-semibold">Google Docs</h3><p className="mt-1 text-sm text-white/50">Create and work with documents here; full editing remains in Google Docs.</p></div>
    {!canUse ? <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">Docs access is not enabled. Enable the capability from Permissions.</div> : <>
      <div className="flex gap-2"><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void search(); }} placeholder="Search documents…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none placeholder:text-white/25"/><button type="button" onClick={() => void search()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium">Search</button></div>
      <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">{docs.length === 0 ? <div className="px-4 py-8 text-center text-sm text-white/35">No documents loaded yet.</div> : docs.map(doc => <button key={doc.id} type="button" onClick={() => void open(doc)} className="block w-full px-4 py-3 text-left hover:bg-white/[0.04]"><p className="text-sm font-medium text-white/80">{doc.title}</p><p className="mt-1 text-xs text-white/35">{doc.modifiedTime ? new Date(doc.modifiedTime).toLocaleString() : 'Google Doc'}</p></button>)}</div>
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><h4 className="text-sm font-semibold">Create document</h4><input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"/><textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={4} placeholder="Initial content" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"/><button type="button" onClick={() => void create()} disabled={!newTitle.trim()} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium disabled:opacity-40">Create</button></div>
      {selected && <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-medium">{selected.title}</h4><p className="mt-1 text-xs text-white/35">Current document content</p></div><a href={selected.url} target="_blank" rel="noreferrer" className="text-xs text-sky-300">Open in Google Docs</a></div><pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5 text-white/65">{selected.content}</pre><div className="flex gap-2"><input value={appendText} onChange={e => setAppendText(e.target.value)} placeholder="Append text…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"/><button type="button" onClick={() => void append()} disabled={!appendText.trim()} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm disabled:opacity-40">Update</button></div></div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{error}</div>}{notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">{notice}</div>}
    </>}
  </div>;
}
