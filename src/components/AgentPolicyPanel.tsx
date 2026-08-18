import React, { useEffect, useState } from 'react';
import { Lock, LockOpen, RotateCcw, Save, X } from 'lucide-react';
import { DEFAULT_AGENT_OPERATING_POLICY, loadAgentOperatingPolicy, resetAgentOperatingPolicy, saveAgentOperatingPolicy } from '../lib/agentPolicy';

export const AgentPolicyPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [policy, setPolicy] = useState(DEFAULT_AGENT_OPERATING_POLICY);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (open) {
      setPolicy(loadAgentOperatingPolicy());
      setDirty(false);
      setUnlocked(false);
    }
  }, [open]);

  const close = () => {
    setUnlocked(false);
    setDirty(false);
    setOpen(false);
  };

  const handleReset = () => {
    const next = DEFAULT_AGENT_OPERATING_POLICY;
    setPolicy(next);
    saveAgentOperatingPolicy(next);
    setDirty(false);
  };

  const handleSave = () => {
    saveAgentOperatingPolicy(policy.trim() || DEFAULT_AGENT_OPERATING_POLICY);
    setPolicy(policy.trim() || DEFAULT_AGENT_OPERATING_POLICY);
    setDirty(false);
    setUnlocked(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] z-40 h-11 w-11 rounded-full border border-zinc-700/80 bg-zinc-900/90 text-zinc-300 shadow-xl backdrop-blur-md transition hover:bg-zinc-800 hover:text-white active:scale-95 md:right-5"
        aria-label="Open agent operating policy"
        title="Agent operating policy"
      >
        <Lock className="mx-auto h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-sm" onClick={close}>
          <section
            className="absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-[var(--elara-surface)] p-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-700" />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Agent behaviour</p>
                <h2 className="text-base font-semibold text-[var(--elara-text)]">Operating policy</h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--elara-text-muted)]">
                  Locked by default. Unlock it only when you want to experiment with how Elara plans, clarifies, retrieves, and acts.
                </p>
              </div>
              <button type="button" onClick={close} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Close policy panel">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-3 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
              <div className="flex items-center gap-2 text-xs text-[var(--elara-text-muted)]">
                {unlocked ? <LockOpen className="h-4 w-4 text-amber-400" /> : <Lock className="h-4 w-4 text-emerald-400" />}
                <span>{unlocked ? 'Editing unlocked' : 'Protected policy'}</span>
              </div>
              <button
                type="button"
                onClick={() => setUnlocked((value) => !value)}
                className={`min-h-11 rounded-xl border px-3 text-sm font-medium transition ${unlocked ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'}`}
              >
                {unlocked ? 'Lock' : 'Unlock to edit'}
              </button>
            </div>

            <textarea
              value={policy}
              onChange={(event) => { setPolicy(event.target.value); setDirty(true); }}
              readOnly={!unlocked}
              spellCheck={false}
              className={`min-h-[48dvh] w-full resize-none rounded-2xl border px-3 py-3 font-mono text-xs leading-relaxed outline-none transition ${unlocked ? 'border-amber-500/50 bg-zinc-950 text-zinc-100 focus:border-amber-400' : 'border-zinc-800 bg-zinc-950/60 text-zinc-400'}`}
              aria-label="Agent operating policy text"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              >
                <RotateCcw className="h-4 w-4" />
                Reset default
              </button>
              <button
                type="button"
                disabled={!unlocked || !dirty}
                onClick={handleSave}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                Save policy
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
