import React, { useEffect, useState } from 'react';
import { BookOpen, Check, Edit3, RefreshCw, X } from 'lucide-react';
import { loadActiveScratchpad, saveActiveScratchpad } from '../lib/contextManager';

const SCRATCHPAD_EVENT = 'elara:scratchpad-updated';

interface ScratchpadPanelProps {
  onBack: () => void;
}

export const ScratchpadPanel: React.FC<ScratchpadPanelProps> = ({ onBack }) => {
  const [value, setValue] = useState(() => loadActiveScratchpad());
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ scratchpad?: string }>).detail;
      setValue(detail?.scratchpad ?? loadActiveScratchpad());
    };
    window.addEventListener(SCRATCHPAD_EVENT, sync);
    return () => window.removeEventListener(SCRATCHPAD_EVENT, sync);
  }, []);

  const refresh = () => setValue(loadActiveScratchpad());
  const save = () => {
    saveActiveScratchpad(value);
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
          <div className="text-[10px] text-zinc-500">Persistent notes fed back into Elara's system context</div>
        </div>
        <button onClick={refresh} className="h-9 w-9 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="Refresh">
          <RefreshCw className="mx-auto h-4 w-4" />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
        <div className="mx-auto max-w-3xl space-y-4">
          <section className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
            <div className="text-xs font-semibold text-amber-300">How this works</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-500">Elara's memory pass condenses durable observations into these notes. They are included in her system payload on subsequent conversations. Manual edits are allowed, but the next AI memory update may revise the list.</p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-3">
            {editing ? (
              <textarea value={value} onChange={(e) => setValue(e.target.value)} className="min-h-[50vh] w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-amber-500/50" />
            ) : (
              <pre className="min-h-[50vh] whitespace-pre-wrap break-words rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-5 text-zinc-300">{value || 'No persistent notes yet. Elara will add durable observations as they become relevant.'}</pre>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
              {editing ? (
                <>
                  <button onClick={() => { setEditing(false); refresh(); }} className="min-h-9 rounded-lg border border-zinc-700 px-3 text-xs text-zinc-400">Discard</button>
                  <button onClick={() => { save(); setEditing(false); }} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-zinc-950 hover:bg-amber-400"><Check className="h-3.5 w-3.5" /> Save scratchpad</button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-xs text-zinc-300 hover:bg-zinc-800"><Edit3 className="h-3.5 w-3.5" /> Edit notes</button>
              )}
            </div>
            {saved && <div className="mt-2 text-right text-[10px] text-emerald-400">Scratchpad saved.</div>}
          </section>
        </div>
      </main>
    </div>
  );
};
