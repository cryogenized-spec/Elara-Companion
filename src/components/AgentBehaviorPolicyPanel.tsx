import React, { useEffect, useMemo, useState } from 'react';
import { Lock, LockOpen, RotateCcw, Save, ShieldCheck, X } from 'lucide-react';
import { DEFAULT_AGENT_OPERATING_POLICY, loadAgentOperatingPolicy, saveAgentOperatingPolicy } from '../lib/agentPolicy';

export const AgentBehaviorPolicyPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [editable, setEditable] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_AGENT_OPERATING_POLICY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(loadAgentOperatingPolicy());
    setEditable(false);
    setSaved(false);
  }, [open]);

  const current = open ? loadAgentOperatingPolicy() : draft;
  const dirty = useMemo(() => draft !== current, [draft, current]);

  const persist = () => {
    if (!editable) return;
    saveAgentOperatingPolicy(draft);
    setSaved(true);
    setEditable(false);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const reset = () => {
    if (!editable) return;
    setDraft(DEFAULT_AGENT_OPERATING_POLICY);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+8.6rem)] z-40 inline-flex h-11 items-center gap-2 rounded-full border border-amber-500/30 bg-zinc-900/90 px-3 text-xs font-semibold text-amber-200 shadow-xl backdrop-blur-md transition active:scale-95 md:right-5" aria-label="Open agent behavior policy">
        <ShieldCheck className="h-4 w-4" />
        <span className="hidden sm:inline">Agent Policy</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <section className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-3xl border border-zinc-800 bg-[var(--elara-surface)] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">Agent Behaviour</p>
                <h2 className="text-base font-semibold text-[var(--elara-text)]">Planning & Action Policy</h2>
                <p className="mt-0.5 text-[10px] text-[var(--elara-text-muted)]">The editable policy used when Elara decides how to investigate and act.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Close agent policy"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                {editable ? <LockOpen className="h-4 w-4 text-emerald-400" /> : <Lock className="h-4 w-4 text-amber-400" />}
                <span>{editable ? 'Editing enabled' : 'Locked — active and read-only'}</span>
              </div>
              <button type="button" onClick={() => setEditable((value) => !value)} className="min-h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200 active:scale-95">{editable ? 'Lock' : 'Unlock to edit'}</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} readOnly={!editable} spellCheck className={`min-h-[46dvh] w-full rounded-2xl border p-3 text-sm leading-6 outline-none transition ${editable ? 'border-emerald-500/40 bg-zinc-950 text-zinc-100 focus:border-emerald-400' : 'border-zinc-800 bg-zinc-950/40 text-zinc-300'} resize-y font-mono`} aria-label="Agent planning and action policy prompt" />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <button type="button" onClick={reset} disabled={!editable} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-300 disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" /> Reset default</button>
              <button type="button" onClick={persist} disabled={!editable || !dirty} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white disabled:opacity-40"><Save className="h-3.5 w-3.5" />{saved ? 'Saved' : 'Save policy'}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
