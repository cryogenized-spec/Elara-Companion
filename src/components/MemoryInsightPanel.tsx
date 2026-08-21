import React, { useMemo, useState } from 'react';
import { CheckCircle2, CircleHelp, AlertTriangle, Info, X } from 'lucide-react';
import type { MemoryItem } from '../types';
import { buildMemoryInsightSummary } from '../lib/memoryInsights';

interface MemoryInsightPanelProps {
  memories: MemoryItem[];
  onClose: () => void;
}

const confidenceIcons = {
  certain: CheckCircle2,
  likely: CircleHelp,
  uncertain: AlertTriangle,
};

export const MemoryInsightPanel: React.FC<MemoryInsightPanelProps> = ({ memories, onClose }) => {
  const [selectedId, setSelectedId] = useState(memories[0]?.id || '');
  const selected = useMemo(() => memories.find((memory) => memory.id === selectedId) || memories[0] || null, [memories, selectedId]);

  if (!selected) {
    return (
      <aside className="fixed inset-x-3 bottom-3 z-[70] rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 text-zinc-100 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-4 sm:top-4 sm:w-[380px]">
        <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Memory insights</h3><button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"><X className="h-4 w-4" /></button></div>
        <p className="mt-3 text-xs text-zinc-500">There are no memories to inspect in this view.</p>
      </aside>
    );
  }

  const insight = buildMemoryInsightSummary(selected);
  const ConfidenceIcon = confidenceIcons[selected.confidence];

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[70] max-h-[82dvh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 text-zinc-100 shadow-2xl backdrop-blur-xl sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:w-[380px]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><h3 className="truncate text-sm font-semibold">Memory insights</h3><p className="text-[10px] text-zinc-600">Why this memory exists</p></div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100" aria-label="Close memory insights"><X className="h-4 w-4" /></button>
      </div>

      {memories.length > 1 && (
        <label className="mt-3 block"><span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-600">Memory</span><select value={selected.id} onChange={(event) => setSelectedId(event.target.value)} className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs outline-none focus:border-amber-500/60">{memories.map((memory) => <option key={memory.id} value={memory.id}>{memory.content.slice(0, 90)}</option>)}</select></label>
      )}

      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
        <div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p className="text-xs leading-5 text-zinc-200">{insight.whySaved}</p></div>
      </div>

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

      <div className="mt-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-3 text-[10px] leading-4 text-zinc-500">This view is read-only. Changing, pinning, deleting, importing, or exporting memories still happens through the existing Scratchpad controls.</div>
    </aside>
  );
};
