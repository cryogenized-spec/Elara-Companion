import React from 'react';
import { AlertTriangle, Archive, Clock3, GitBranch, Link2, Search, ShieldCheck } from 'lucide-react';
import type { MemoryItem, MemoryScratchpadState, MemoryState } from '../types';
import { getDbMemoryState } from '../lib/db';

export const MEMORY_TRANSPARENCY_READ_OPTIONS = Object.freeze({
  runMaintenance: false,
  updateProjections: false,
} as const);

const STATE_LABEL: Record<MemoryState, string> = {
  active: 'Active', stale: 'Stale', archived: 'Archived', superseded: 'Superseded', conflicted: 'Conflicted',
};

const STATE_CLASS: Record<MemoryState, string> = {
  active: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
  stale: 'border-amber-500/20 bg-amber-500/5 text-amber-300',
  archived: 'border-zinc-700 bg-zinc-900 text-zinc-400',
  superseded: 'border-violet-500/20 bg-violet-500/5 text-violet-300',
  conflicted: 'border-rose-500/20 bg-rose-500/5 text-rose-300',
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const resolutionLabel = (memory: MemoryItem) =>
  memory.resolution || (memory.lifecycle === 'core' ? 'core' : memory.kind === 'observation' ? 'observation' : 'contextual');

const sourceLabel = (memory: MemoryItem) =>
  memory.sourceConversationId ? 'Conversation' : memory.sourceArtifactId ? 'Artifact' : memory.source || 'conversation';

const MemoryDetails: React.FC<{ memory: MemoryItem; allMemories: MemoryItem[] }> = ({ memory, allMemories }) => {
  const state = memory.state || 'active';
  const evidenceIds = memory.evidenceMemoryIds || [];
  const evidenceCount = Math.max(memory.evidenceCount || 0, evidenceIds.length);
  const relatedIds = new Set([
    ...(memory.relatedMemoryIds || []),
    ...(memory.links || []).filter((link) => link.type === 'memory').map((link) => link.id),
  ]);
  const related = allMemories.filter((item) => relatedIds.has(item.id));
  const conflictIds = memory.conflictMemoryIds || [];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-200">{memory.content}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-2.5"><span className="text-[10px] text-zinc-600">Resolution</span><p className="mt-1 text-xs text-zinc-200">{resolutionLabel(memory)}</p></div>
        <div className={`rounded-xl border p-2.5 ${STATE_CLASS[state]}`}><span className="text-[10px] opacity-70">State</span><p className="mt-1 text-xs font-medium">{STATE_LABEL[state]}</p></div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-2.5"><span className="text-[10px] text-zinc-600">Confidence</span><p className="mt-1 text-xs text-zinc-200">{memory.confidence}</p></div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-2.5"><span className="text-[10px] text-zinc-600">Importance</span><p className="mt-1 text-xs text-zinc-200">{memory.importance}</p></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <h4 className="flex items-center gap-2 text-[11px] font-semibold text-zinc-200"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Why remembered</h4>
          <dl className="mt-2 space-y-1.5 text-[10px]"><div className="flex justify-between gap-2"><dt className="text-zinc-600">Source</dt><dd className="text-right text-zinc-300">{sourceLabel(memory)}</dd></div><div className="flex justify-between gap-2"><dt className="text-zinc-600">Category</dt><dd className="text-right text-zinc-300">{memory.category}</dd></div><div className="flex justify-between gap-2"><dt className="text-zinc-600">Created</dt><dd className="text-right text-zinc-300">{formatDate(memory.createdAt)}</dd></div><div className="flex justify-between gap-2"><dt className="text-zinc-600">Last observed</dt><dd className="text-right text-zinc-300">{formatDate(memory.lastObservedAt)}</dd></div></dl>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <h4 className="flex items-center gap-2 text-[11px] font-semibold text-zinc-200"><GitBranch className="h-3.5 w-3.5 text-violet-300" /> Evidence</h4>
          <dl className="mt-2 space-y-1.5 text-[10px]"><div className="flex justify-between gap-2"><dt className="text-zinc-600">Evidence</dt><dd className="text-right text-zinc-300">{evidenceCount}</dd></div><div className="flex justify-between gap-2"><dt className="text-zinc-600">Reinforced</dt><dd className="text-right text-zinc-300">{memory.reinforcementCount || 0}×</dd></div><div className="flex justify-between gap-2"><dt className="text-zinc-600">Retrieved</dt><dd className="text-right text-zinc-300">{memory.retrievalCount || 0}×</dd></div><div className="flex justify-between gap-2"><dt className="text-zinc-600">Last recalled</dt><dd className="text-right text-zinc-300">{formatDate(memory.lastRecalledAt)}</dd></div></dl>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><h4 className="flex items-center gap-2 text-[11px] font-semibold text-zinc-200"><Link2 className="h-3.5 w-3.5 text-sky-300" /> Relationships</h4><div className="mt-2 space-y-1.5 text-[10px] text-zinc-400"><div>Conversation: <span className="text-zinc-300">{memory.sourceConversationId || '—'}</span></div><div>Artifact: <span className="text-zinc-300">{memory.sourceArtifactId || '—'}</span></div><div>Supersedes: <span className="text-zinc-300">{memory.supersedesMemoryId || '—'}</span></div><div>Superseded by: <span className="text-zinc-300">{memory.supersededByMemoryId || '—'}</span></div></div></div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><h4 className="flex items-center gap-2 text-[11px] font-semibold text-zinc-200"><Clock3 className="h-3.5 w-3.5 text-amber-300" /> Lifecycle</h4><div className="mt-2 space-y-1.5 text-[10px] text-zinc-400"><div>Lifecycle: <span className="text-zinc-300">{memory.lifecycle || 'persistent'}</span></div><div>Expires: <span className="text-zinc-300">{formatDate(memory.expiresAt)}</span></div><div>Pinned: <span className="text-zinc-300">{memory.pinned ? 'Yes' : 'No'}</span></div></div></div>
      </div>

      {evidenceIds.length > 0 && <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><p className="text-[11px] font-semibold text-zinc-200">Supporting evidence references</p><div className="mt-2 flex flex-wrap gap-1.5">{evidenceIds.map((id) => <span key={id} className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[9px] text-zinc-500">{id}</span>)}</div>{evidenceCount > evidenceIds.length && <p className="mt-2 text-[9px] text-zinc-600">Only retained evidence references are shown; aggregate evidence count is {evidenceCount}.</p>}</div>}
      {related.length > 0 && <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><p className="text-[11px] font-semibold text-zinc-200">Related memories</p><div className="mt-2 space-y-1.5">{related.map((item) => <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-2.5 py-2 text-[10px] text-zinc-400"><span className="text-zinc-200">{item.category}</span> · {item.content}</div>)}</div></div>}
      {conflictIds.length > 0 && <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-[10px] text-rose-200"><div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-3.5 w-3.5" /> Unresolved conflict</div><p className="mt-1 text-rose-200/70">Related records: {conflictIds.join(', ')}</p></div>}
      {state === 'archived' && <div className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-[10px] text-zinc-500"><Archive className="mt-0.5 h-3.5 w-3.5" /> Retained for history, but excluded from ordinary retrieval.</div>}
    </div>
  );
};

export const MemoryTransparencySettingsPanel: React.FC = () => {
  const [state, setState] = React.useState<MemoryScratchpadState | null>(null);
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const next = await getDbMemoryState(MEMORY_TRANSPARENCY_READ_OPTIONS);
      setState(next);
      setSelectedId((current) => current && next.memories.some((memory) => memory.id === current) ? current : next.memories[0]?.id || null);
    } catch (cause) {
      console.error('Failed to load memory transparency state:', cause);
      setError('Memory data could not be loaded. The Scratchpad and chat are unaffected.');
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const memories = state?.memories || [];
  const filtered = memories.filter((memory) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [memory.content, memory.category, memory.kind, memory.resolution, memory.lifecycle, memory.state, ...(memory.tags || [])].some((value) => String(value || '').toLowerCase().includes(q));
  }).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const selected = memories.find((memory) => memory.id === selectedId) || null;
  const staleCount = memories.filter((memory) => memory.state === 'stale').length;
  const conflictedCount = memories.filter((memory) => memory.state === 'conflicted').length;
  const archivedCount = memories.filter((memory) => memory.state === 'archived' || memory.lifecycle === 'archived').length;

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300"><Search className="h-4 w-4 text-amber-400" /> Memory transparency</h3><p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Inspect what Elara remembers and why. This view is read-only.</p></div><button type="button" onClick={() => void refresh()} className="rounded-lg border border-zinc-700/60 bg-zinc-800 px-2.5 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-700">Refresh</button></div>
      <div className="grid grid-cols-3 gap-2"><div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-2.5"><span className="text-[10px] text-zinc-600">Stored</span><p className="mt-1 text-sm font-semibold text-zinc-200">{memories.length}</p></div><div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-2.5"><span className="text-[10px] text-zinc-600">Stale</span><p className="mt-1 text-sm font-semibold text-amber-300">{staleCount}</p></div><div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-2.5"><span className="text-[10px] text-zinc-600">Conflicted</span><p className="mt-1 text-sm font-semibold text-rose-300">{conflictedCount}</p></div></div>
      {archivedCount > 0 && <p className="text-[9px] text-zinc-600">{archivedCount} archived record{archivedCount === 1 ? '' : 's'} retained for history.</p>}
      <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search memory details..." className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 text-xs text-zinc-200 outline-none focus:border-amber-500/50" /></label>
      {error ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-[10px] text-rose-200">{error}</div> : loading ? <div className="rounded-xl border border-dashed border-zinc-800 px-3 py-8 text-center text-[11px] text-zinc-600">Loading memory state…</div> : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-zinc-800 px-3 py-8 text-center text-[11px] text-zinc-600">No memories match this search.</div> : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div className="max-h-[42rem] space-y-1.5 overflow-y-auto pr-1">{filtered.map((memory) => { const currentState = memory.state || 'active'; const selected = memory.id === selectedId; return <button key={memory.id} type="button" onClick={() => setSelectedId(memory.id)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${selected ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'}`}><div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-medium text-zinc-200">{memory.category} · {resolutionLabel(memory)}</span><span className={`rounded-md border px-1.5 py-0.5 text-[9px] ${STATE_CLASS[currentState]}`}>{STATE_LABEL[currentState]}</span></div><p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-400">{memory.content}</p><div className="mt-2 flex items-center gap-2 text-[9px] text-zinc-600"><span>{memory.confidence}</span><span>·</span><span>{memory.importance}</span><span>·</span><span>{memory.reinforcementCount || 0}× reinforced</span></div></button>; })}</div><div className="min-w-0">{selected ? <MemoryDetails memory={selected} allMemories={memories} /> : <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-[11px] text-zinc-600">Select a memory to inspect it.</div>}</div></div>
      )}
    </section>
  );
};
