import React, { useState } from 'react';
import { createGoogleSheet, getSpreadsheetDetails, readSheetValues, writeSheetValues, type SheetMetadata } from '../../services/googleSheetsService';

export interface SheetsCapabilityPanelProps { canRead: boolean; canWrite: boolean; onActivity?: (description: string, reversible?: boolean) => void; }

export function SheetsCapabilityPanel({ canRead, canWrite, onActivity }: SheetsCapabilityPanelProps) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [range, setRange] = useState('A1:F12');
  const [values, setValues] = useState<any[][]>([]);
  const [details, setDetails] = useState<SheetMetadata | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const inspect = async () => { if (!canRead || !spreadsheetId.trim()) return; setLoading(true); setError(null); try { const meta = await getSpreadsheetDetails(spreadsheetId.trim()); setDetails(meta); const sheet = await readSheetValues(spreadsheetId.trim(), range.trim() || 'A1:F12'); setValues(sheet.values); onActivity?.(`Read Google Sheet range ${sheet.range}`); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to read spreadsheet.'); } finally { setLoading(false); } };
  const create = async () => { if (!canWrite || !newTitle.trim()) return; setError(null); try { const sheet = await createGoogleSheet(newTitle.trim(), ['Field', 'Value']); setSpreadsheetId(sheet.spreadsheetId); setDetails(sheet); setNotice(`Created “${sheet.title}”.`); onActivity?.(`Created Google Spreadsheet “${sheet.title}”`, true); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create spreadsheet.'); } };
  const write = async () => { if (!canWrite || !spreadsheetId.trim()) return; setError(null); try { const result = await writeSheetValues(spreadsheetId.trim(), range.trim(), values); setNotice(`Wrote ${result.updatedCells} cells.`); onActivity?.(`Updated Google Sheet range ${result.updatedRange}`, true); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to write spreadsheet.'); } };

  return <div className="space-y-5"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">Data</p><h3 className="mt-1 text-lg font-semibold">Google Sheets</h3><p className="mt-1 text-sm text-white/50">Inspect structured data here; Google Sheets remains the full editor.</p></div>
    {(!canRead && !canWrite) ? <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">Sheets access is not enabled. Enable the capability from Permissions.</div> : <>
      <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]"><input value={spreadsheetId} onChange={e => setSpreadsheetId(e.target.value)} placeholder="Spreadsheet ID" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"/><input value={range} onChange={e => setRange(e.target.value)} placeholder="Range e.g. A1:F12" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"/><button type="button" onClick={() => void inspect()} disabled={loading || !canRead || !spreadsheetId.trim()} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm disabled:opacity-40">{loading ? 'Reading…' : 'Inspect'}</button></div>
      {details && <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{details.title}</p><a href={details.spreadsheetUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-300">Open in Sheets</a></div><p className="mt-1 text-xs text-white/35">{details.sheets.map(s => s.title).join(' • ')}</p></div>}
      <div className="overflow-auto rounded-2xl border border-white/10 bg-white/[0.03]"><table className="min-w-full text-xs"><tbody>{values.map((row, r) => <tr key={r} className="border-b border-white/5">{row.map((cell, c) => <td key={c} className="min-w-28 border-r border-white/5 px-3 py-2 align-top">{canWrite ? <input value={String(cell ?? '')} onChange={e => setValues(prev => prev.map((rr, ri) => ri === r ? rr.map((cc, ci) => ci === c ? e.target.value : cc) : rr))} className="w-full bg-transparent outline-none"/> : String(cell ?? '')}</td>)}</tr>)}</tbody></table>{values.length === 0 && <div className="px-4 py-8 text-center text-sm text-white/35">No values loaded.</div>}</div>
      {canWrite && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void write()} disabled={!spreadsheetId.trim() || values.length === 0} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm disabled:opacity-40">Save changes</button><input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="New spreadsheet title" className="min-w-48 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"/><button type="button" onClick={() => void create()} disabled={!newTitle.trim()} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm disabled:opacity-40">Create</button></div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{error}</div>}{notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">{notice}</div>}
    </>}
  </div>;
}
