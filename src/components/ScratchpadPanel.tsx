import React, { useEffect, useState } from 'react';
import { BookOpen, Check, Edit3, RefreshCw, X } from 'lucide-react';
import { loadScratchpadProjection, saveScratchpadProjection, loadScratchpadMemoryState } from '../services/scratchpadService';
import { MemoryHealthSummary } from './MemoryHealthSummary';
import type { MemoryScratchpadState } from '../types';

const SCRATCHPAD_EVENT = 'elara:scratchpad-updated';

interface ScratchpadPanelProps {
  onBack: () => void;
}

const EMPTY_MEMORY_STATE: MemoryScratchpadState = {
  memories: [],
  lastMaintenanceAt: '',
  autoMaintenanceEnabled: true,
  schemaVersion: 3,
};

export const ScratchpadPanel: React.FC<ScratchpadPanelProps> = ({ onBack }) => {
  const [value, setValue] = useState(() => loadScratchpadProjection());
  const [memoryState, setMemoryState] = useState<MemoryScratchpadState>(EMPTY_MEMORY_STATE);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const refresh = () => {
    setValue(loadScratchpadProjection());
    void loadScratchpadMemoryState().then(setMemoryState).catch(() => setMemoryState(EMPTY_MEMORY_STATE));
  };

  useEffect(() => {
    refresh();
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ scratchpad?: string }>).detail;
      setValue(detail?.scratchpad ?? loadScratchpadProjection());
      void loadScratchpadMemoryState().then(setMemoryState).catch(() => undefined);
    };
    window.addEventListener(SCRATCHPAD_EVENT, sync);
    return () => window.removeEventListener(SCRATCHPAD_EVENT, sync);
  }, []);

  const save = () => {
    saveScratchpadProjection(value);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
    window.dispatchEvent(new CustomEvent(SCRATCHPAD_EVENT, { detail: { scratchpad: value } }));
  };

  return (
    <div className="fixed inset-0 z-30 flex h-[100dvh] w-full flex-col bg-[#09090b] text-zinc-100">
      <header className="flex min-h-14 items-center gap-3 border-b border-zinc-800 bg-[#0d0d0f]/95 px-3 backdrop-blur-xl">
        <button onClick={onBack} className="h-9 w-9 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="Close">
          <X className="mx-auto h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-amber-400" />
            Elara's Scratchpad
          </div>
          <div className="text-[10px] text-zinc-500">Derived notes shown here; structured memory is the source of truth</div>
        </div>
        <button onClick={refresh} className="h-9 w-9 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="Refresh">
          <RefreshCw className="mx-auto h-4 w-4" />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
        <div className="mx-auto max-w-4xl space-y-4">
          <MemoryHealthSummary memoryState={memoryState} />
          <section className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
            <div className="text-xs font-semibold text-amber-300">How this works</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-500">This panel displays the derived Scratchpad projection used for human inspection. Contextual retrieval is built from structured memory, not from this text wholesale. Manual edits remain possible for convenience, but they are projection edits and may be replaced when the structured memory state is refreshed.</p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-3">
            {editing ? (
              <textarea value={value} onChange={(e) => setValue(e.target.value)} className="min-h-[50vh] w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-amber-500/50" />
            ) : (
              <pre className="min-h-[50vh] whitespace-pre-wrap break-words rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-5 text-zinc-300">{value || 'No persistent projection yet. Elara will populate the Scratchpad from durable memory state.'}</pre>
            )}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
              {editing ? (
                <>
                  <button onClick={() => { setEditing(false); refresh(); }} className="min-h-9 rounded-lg border border-zinc-700 px-3 text-xs text-zinc-400">Discard</button>
                  <button onClick={() => { save(); setEditing(false); }} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-zinc-950 hover:bg-amber-400"><Check className="h-3.5 w-3.5" /> Save projection</button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-xs text-zinc-300 hover:bg-zinc-800"><Edit3 className="h-3.5 w-3.5" /> Edit projection</button>
              )}
            </div>
            {saved && <div className="mt-2 text-right text-[10px] text-emerald-400">Projection saved locally.</div>}
          </section>
        </div>
      </main>
    </div>
  );
};
