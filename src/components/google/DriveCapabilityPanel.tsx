import React, { useState } from 'react';
import { listGoogleDriveFiles, readGoogleDriveFile, type GoogleDriveFileSummary } from '../../services/googleDocsDriveService';

export interface DriveCapabilityPanelProps { canRead: boolean; onActivity?: (description: string, reversible?: boolean) => void; }

export function DriveCapabilityPanel({ canRead, onActivity }: DriveCapabilityPanelProps) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<GoogleDriveFileSummary[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string; mimeType: string; content: string; webViewLink: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => { if (!canRead) return; setLoading(true); setError(null); try { const result = await listGoogleDriveFiles(10, query); setFiles(result.files); setSelected(null); onActivity?.(`Listed ${result.files.length} Google Drive file${result.files.length === 1 ? '' : 's'}`); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to read Drive.'); } finally { setLoading(false); } };
  const inspect = async (file: GoogleDriveFileSummary) => { setLoading(true); setError(null); try { const result = await readGoogleDriveFile(file.id); setSelected(result); onActivity?.(`Inspected Drive file “${result.name}”`); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to inspect Drive file.'); } finally { setLoading(false); } };

  return <div className="space-y-5">
    <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">Files</p><h3 className="mt-1 text-lg font-semibold">Google Drive</h3><p className="mt-1 text-sm text-white/50">Use Drive as the external library; Elara retrieves content when it is needed.</p></div>
    {!canRead ? <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">Drive read access is not enabled. Enable the capability from Permissions.</div> : <>
      <div className="flex gap-2"><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void search(); }} placeholder="Search Drive…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none placeholder:text-white/25" /><button type="button" onClick={() => void search()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/[0.06]">{loading ? 'Searching…' : 'Search'}</button></div>
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{error}</div>}
      <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">{files.length === 0 ? <div className="px-4 py-8 text-center text-sm text-white/35">No Drive files loaded yet.</div> : files.map(file => <button key={file.id} type="button" onClick={() => void inspect(file)} className="block w-full px-4 py-3 text-left hover:bg-white/[0.04]"><p className="truncate text-sm font-medium text-white/80">{file.name}</p><p className="mt-1 text-xs text-white/35">{file.mimeType}{file.modifiedTime ? ` • ${new Date(file.modifiedTime).toLocaleString()}` : ''}</p></button>)}</div>
      {selected && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-medium">{selected.name}</h4><p className="mt-1 text-xs text-white/35">{selected.mimeType}</p></div><a href={selected.webViewLink} target="_blank" rel="noreferrer" className="text-xs text-sky-300 hover:text-sky-200">Open in Google</a></div><pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-5 text-white/65">{selected.content}</pre></div>}
    </>}
  </div>;
}
