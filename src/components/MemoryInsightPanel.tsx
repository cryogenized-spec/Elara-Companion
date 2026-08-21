import React, { useMemo, useState } from 'react';
import { CheckCircle2, CircleHelp, AlertTriangle, Info, X } from 'lucide-react';
import type { MemoryItem } from '../types';
import { buildMemoryInsightSummary } from '../lib/memoryInsights';

interface MemoryInsightPanelProps {
  memories: MemoryItem[];
  onClose: () => void;
  lastMaintenanceAt?: string;
}

const confidenceIcons = { certain: CheckCircle2, likely: CircleHelp, uncertain: AlertTriangle };

function formatDate(value?: string): string {
  if (!value) return 'Not recorded';
  const date = Date.parse(value);
  return Number.isFinite(date) ? new Date(date).toLocaleString() : 'Not recorded';
}

export const MemoryInsightPanel: React.FC<MemoryInsightPanelProps> = ({ memories, onClose, lastMaintenanceAt }) => {
  const [selectedId, setSelectedId] = useState(memories[0]?.id || '');
  const selected = useMemo(() => memories.find((memory) => memory.id === selectedId) || memories[0] || null, [memories, selectedId]);
  const health = useMemo(() => ({
    total: memories.length,
    active: memories.filter((memory) => (memory.state || 'active') === 'active').length,
    stale: memories.filter((memory) => memory.state === 'stale').length,
    archived: memories.filter((memory) => (memory.state || memory.lifecycle) === 'archived' || memory.lifecycle === 'archived').length,
    core: memories.filter((memory) => memory.resolution === 'core' || memory.lifecycle === 'core' || memory.importance === 'core').length,
    pinned: memories.filter((memory) => memory.pinned).length,
    conflicted: memories.filter((memory) => memory.state === 'conflicted').length,
    evidenceBacked: memories.filter((memory) => (memory.evidenceCount || 0) > 0 || (memory.evidenceMemoryIds?.length || 0) > 0).length,
  }), [memories]);

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[70] max-h-[82dvh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 text-zinc-100 shadow-2xl backdrop-blur-xl sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:w-[380px]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><h3 className="truncate text-sm font-semibold">Memory insights</h3><p className="text-[10px] text-zinc-600">Health, provenance and why a memory was kept</p></div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100" aria-label="Close memory insights"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[10px]">
        {([['Total', health.total], ['Active', health.active], ['Stale', health.stale], ['Archived', health.archived], ['Core', health.core], ['Pinned', health.pinned], ['Conflicts', health.conflicted], ['Evidence', health.evidenceBacked]] as const).map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-2 py-2"><div className="text-zinc-600">{label}</div><div className="mt-0.5 font-semibold text-zinc-200">{value}</div></div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">Last maintenance: {formatDate(lastMaintenanceAt)}</p>

      {selected ? (
        <>
          {memories.length > 1 && <label className="mt-3 block"><span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-600">Memory</span><select value={selected.id} onChange={(event) => setSelectedId(event.target.value)} className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs outline-none focus:border-amber-500/60">{memories.map((memory) => <option key={memory.id} value={memory.id}>{memory.content.slice(0, 90)}</option>)}</select></label>}

          {(() => {
            const insight = buildMemoryInsightSummary(selected);
            const ConfidenceIcon = confidenceIcons[selected.confidence];
            return <>
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"><div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p className="text-xs leading-5 text-zinc-200">{insight.whySaved}</p></div></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"><div className="text-[9px] uppercase tracking-wide text-zinc-600">Resolution</div><div className="mt-1 text-zinc-200">{insight.resolutionLabel}</div></div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"><div className="text-[9px] uppercase tracking-wide text-zinc-600">State</div><div className="mt-1 text-zinc-200">{insight.stateLabel}</div></div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"><div className="text-[9px] uppercase tracking-wide text-zinc-600">Confidence</div><div className="mt-1 flex items-center gap-1.5 text-zinc-200"><ConfidenceIcon className="h-3.5 w-3.5" />{selected.confidence}</div></div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"><div className="text-[9px] uppercase tracking-wide text-zinc-600">Importance</div><div className="mt-1 text-zinc-200">{selected.importance}</div></div>
              </div>
              <section className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"><h4 className="text-[10px] uppercase tracking-wide text-zinc-600">Evidence</h4><p className="mt-1 text-[11px] leading-5 text-zinc-300">{insight.evidenceSummary}</p></section>
              <section className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"><h4 className="text-[10px] uppercase tracking-wide text-zinc-600">Provenance</h4><p className="mt-1 break-words text-[11px] leading-5 text-zinc-300">{insight.provenanceSummary}</p></section>
              <section className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"><h4 className="text-[10px] uppercase tracking-wide text-zinc-600">Freshness</h4><p className="mt-1 text-[11px] leading-5 text-zinc-300">{insight.freshnessSummary}</p></section>
              <section className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"><h4 className="text-[10px] uppercase tracking-wide text-zinc-600">Relationships</h4><p className="mt-1 break-words text-[11px] leading-5 text-zinc-300">{insight.relationshipSummary}</p></section>
            </>;
          })()}
        </>
      ) : <p className="mt-4 text-xs text-zinc-500">There are no memories to inspect in this view.</p>}

      <div className="mt-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-3 text-[10px] leading-4 text-zinc-500">Read-only transparency surface. Memory editing, pinning, deletion, import, export and maintenance remain in the existing Scratchpad controls.</div>
    </aside>
  );
};
