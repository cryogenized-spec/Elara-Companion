import React from 'react';
import { FileText, RotateCcw, ShieldCheck } from 'lucide-react';
import { getComposerDraftPreferences, saveComposerDraftPreferences, ComposerDraftPreferences } from '../lib/composerDraftStorage';
import { MarkdownHelpButton } from './MarkdownHelpButton';

export const ChatEditorSettingsPanel: React.FC = () => {
  const [prefs, setPrefs] = React.useState<ComposerDraftPreferences>(() => getComposerDraftPreferences());

  const update = (patch: Partial<ComposerDraftPreferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveComposerDraftPreferences(next);
  };

  const reset = () => {
    const next = getComposerDraftPreferences(true);
    setPrefs(next);
    saveComposerDraftPreferences(next);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-400" /> Chat & Editor
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
              Lightweight formatting, durable drafts, and recovery behaviour for the message composer.
            </p>
          </div>
          <button type="button" onClick={reset} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-200">Markdown formatting</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">User and Elara messages use the same chat Markdown contract. The small M↓ hint in the composer opens the quick reference.</p>
            </div>
            <MarkdownHelpButton inline />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-xs font-semibold text-zinc-200">Durable drafts</p>
              <p className="text-[11px] text-zinc-500">Protect long unsent messages from app termination, tab switching, or reloads.</p>
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
            <span>
              <span className="block text-xs font-medium text-zinc-200">Save unsent drafts</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-500">Automatically persist the current composer per conversation.</span>
            </span>
            <button type="button" role="switch" aria-checked={prefs.enabled} onClick={() => update({ enabled: !prefs.enabled })} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${prefs.enabled ? 'bg-emerald-600' : 'bg-zinc-800'}`}>
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-zinc-200">Keep drafts for</p>
                <p className="text-[11px] text-zinc-500">Older drafts are pruned automatically.</p>
              </div>
              <select value={prefs.maxAgeDays} onChange={(e) => update({ maxAgeDays: Number(e.target.value) })} disabled={!prefs.enabled} className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 disabled:opacity-50">
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-zinc-600">Drafts stay local to this browser/profile. They are not sent to Gemini until you press Send.</p>
        </div>
      </section>
    </div>
  );
};
