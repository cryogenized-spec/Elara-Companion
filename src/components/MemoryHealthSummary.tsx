import React from 'react';
import { AlertTriangle, Archive, Database, Fingerprint, LockKeyhole, Pin, RefreshCw } from 'lucide-react';
import type { MemoryScratchpadState } from '../types';
import { summarizeMemoryState } from '../lib/memoryTransparency';

interface MemoryHealthSummaryProps {
  memoryState: MemoryScratchpadState;
}

export const MemoryHealthSummary: React.FC<MemoryHealthSummaryProps> = ({ memoryState }) => {
  const summary = summarizeMemoryState(memoryState);
  const maintenanceLabel = summary.lastMaintenanceAt
    ? new Date(summary.lastMaintenanceAt).toLocaleString()
    : 'Not yet recorded';

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <Database className="h-4 w-4 text-amber-400" />
            Memory health & provenance
          </div>
          <p className="mt-1 text-[10px] leading-4 text-zinc-500">
            Structured memory is authoritative. The Scratchpad is only a derived presentation/cache surface.
          </p>
        </div>
        <span className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[9px] text-zinc-500">
          schema v{summary.schemaVersion}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2"><div className="text-[9px] text-zinc-600">Total</div><div className="mt-0.5 text-sm font-semibold text-zinc-200">{summary.total}</div></div>
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-2"><div className="text-[9px] text-emerald-500/70">Active</div><div className="mt-0.5 text-sm font-semibold text-zinc-200">{summary.active}</div></div>
        <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-2"><div className="text-[9px] text-amber-500/70">Stale</div><div className="mt-0.5 text-sm font-semibold text-zinc-200">{summary.stale}</div></div>
        <div className="rounded-xl border border-zinc-700 bg-zinc-950/80 p-2"><div className="text-[9px] text-zinc-600">Archived</div><div className="mt-0.5 text-sm font-semibold text-zinc-200">{summary.archived}</div></div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] text-zinc-500">
        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1"><Fingerprint className="h-3 w-3" /> evidence {summary.evidenceTotal}</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1"><Pin className="h-3 w-3" /> pinned {summary.pinned}</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1"><LockKeyhole className="h-3 w-3" /> private {summary.privateCount}</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1"><Archive className="h-3 w-3" /> core {summary.core}</span>
        {summary.conflicted > 0 && <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/[0.03] px-2 py-1 text-rose-300"><AlertTriangle className="h-3 w-3" /> conflicted {summary.conflicted}</span>}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[9px] text-zinc-600">
        <RefreshCw className="h-3 w-3" /> Last maintenance: {maintenanceLabel}
      </div>
    </section>
  );
};
