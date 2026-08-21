import React from 'react';
import { Activity, ChevronDown, RefreshCw } from 'lucide-react';
import { getLastMemoryRetrievalTrace } from '../lib/contextManager';
import type { MemoryRetrievalDisposition, MemoryRetrievalTrace } from '../lib/memoryRetrieval';

const DISPOSITION_LABEL: Record<MemoryRetrievalDisposition, string> = {
  selected: 'Selected',
  'below-threshold': 'Below threshold',
  'filtered-archived': 'Archived',
  'filtered-conflicted': 'Conflicted',
  'filtered-superseded': 'Superseded',
  'trimmed-by-limit': 'Trimmed by limit',
};

const DISPOSITION_CLASS: Record<MemoryRetrievalDisposition, string> = {
  selected: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
  'below-threshold': 'border-zinc-800 bg-zinc-950 text-zinc-500',
  'filtered-archived': 'border-zinc-800 bg-zinc-950 text-zinc-600',
  'filtered-conflicted': 'border-rose-500/20 bg-rose-500/5 text-rose-300',
  'filtered-superseded': 'border-violet-500/20 bg-violet-500/5 text-violet-300',
  'trimmed-by-limit': 'border-amber-500/20 bg-amber-500/5 text-amber-300',
};

export const MemoryRetrievalTransparencyPanel: React.FC = () => {
  const [trace, setTrace] = React.useState<MemoryRetrievalTrace | null>(() => getLastMemoryRetrievalTrace());
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => setTrace(getLastMemoryRetrievalTrace()), []);

  React.useEffect(() => {
    const timer = window.setInterval(refresh, 1500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300"><Activity className="h-4 w-4 text-cyan-400" /> Retrieval transparency</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Inspect the latest memory retrieval decision. This view is diagnostic-only and does not modify memory.</p>
        </div>
        <button type="button" onClick={refresh} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800 px-2.5 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-700"><RefreshCw className="h-3 w-3" /> Refresh</button>
      </div>

      {!trace ? (
        <div className="rounded-xl border border-dashed border-zinc-800 px-3 py-8 text-center text-[11px] text-zinc-600">No retrieval trace yet. Send a message to populate this panel.</div>
      ) : (
        <>
          <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-3 space-y-2">
            <div className="text-[10px] text-zinc-500">Latest query</div>
            <p className="text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap">{trace.query}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <div><div className="text-[9px] text-zinc-600">Candidates</div><div className="text-sm text-zinc-200">{trace.candidateCount}</div></div>
              <div><div className="text-[9px] text-zinc-600">Selected</div><div className="text-sm text-emerald-300">{trace.selectedCount}</div></div>
              <div><div className="text-[9px] text-zinc-600">Injected</div><div className="text-sm text-cyan-300">{trace.injectedCount}</div></div>
              <div><div className="text-[9px] text-zinc-600">Context</div><div className="text-sm text-zinc-200">{trace.contextChars} chars</div></div>
              <div><div className="text-[9px] text-zinc-600">Threshold</div><div className="text-sm text-zinc-200">{trace.minimumScore.toFixed(2)}</div></div>
            </div>
          </div>

          <div className="space-y-1.5">
            {trace.candidates.map((candidate) => {
              const isOpen = expanded === candidate.memory.id;
              return (
                <div key={candidate.memory.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden">
                  <button type="button" onClick={() => setExpanded(isOpen ? null : candidate.memory.id)} className="w-full px-3 py-2.5 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[10px] font-medium text-zinc-200">{candidate.memory.category} · {candidate.memory.id}</div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-400">{candidate.memory.content}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5"><span className={`rounded-md border px-1.5 py-0.5 text-[9px] ${DISPOSITION_CLASS[candidate.disposition]}`}>{DISPOSITION_LABEL[candidate.disposition]}</span><span className="text-[10px] text-zinc-500">{Math.round(candidate.score * 100)}%</span><ChevronDown className={`h-3.5 w-3.5 text-zinc-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></div>
                    </div>
                  </button>
                  {isOpen && <div className="border-t border-zinc-800 px-3 py-2.5 space-y-2">
                    <div><div className="text-[9px] uppercase tracking-wide text-zinc-600">Why</div><div className="mt-1 flex flex-wrap gap-1.5">{candidate.reasons.length ? candidate.reasons.map((reason) => <span key={reason} className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[9px] text-zinc-400">{reason}</span>) : <span className="text-[9px] text-zinc-600">No positive match reason recorded.</span>}</div></div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] text-zinc-600"><div>Resolution <span className="text-zinc-300">{candidate.memory.resolution || 'legacy'}</span></div><div>State <span className="text-zinc-300">{candidate.memory.state || 'legacy'}</span></div><div>Importance <span className="text-zinc-300">{candidate.memory.importance}</span></div><div>Evidence <span className="text-zinc-300">{candidate.memory.evidenceCount || 0}</span></div></div>
                  </div>}
                </div>
              );
            })}
          </div>
          <p className="text-[9px] leading-relaxed text-zinc-600">Trace timestamp: {new Date(trace.generatedAt).toLocaleString()}. The trace lives only in runtime memory and is not persisted as a memory record.</p>
        </>
      )}
    </section>
  );
};
