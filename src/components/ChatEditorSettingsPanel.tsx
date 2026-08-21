import React from 'react';
import { Clipboard, Copy, FileText, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { getComposerDraftPreferences, saveComposerDraftPreferences, ComposerDraftPreferences } from '../lib/composerDraftStorage';
import {
  clearAllOutgoingRecovery,
  clearOutgoingRecoveryEntry,
  listOutgoingRecoveryEntries,
  type OutgoingRecoveryEntry,
} from '../lib/outgoingRecoveryStorage';
import { MarkdownHelpButton } from './MarkdownHelpButton';
import { MemoryTransparencySettingsPanel } from './MemoryTransparencySettingsPanel';

const TEXTAREA_SELECTOR = 'textarea[placeholder*="Message Elara"]';

function restoreToComposer(content: string): void {
  const textarea = document.querySelector<HTMLTextAreaElement>(TEXTAREA_SELECTOR);
  if (!textarea) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(textarea, content);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
  textarea.scrollTop = textarea.scrollHeight;
}

export const ChatEditorSettingsPanel: React.FC = () => {
  const [prefs, setPrefs] = React.useState<ComposerDraftPreferences>(() => getComposerDraftPreferences());
  const [recoveryEntries, setRecoveryEntries] = React.useState<OutgoingRecoveryEntry[]>([]);

  const loadRecovery = React.useCallback(async () => {
    setRecoveryEntries(await listOutgoingRecoveryEntries());
  }, []);

  React.useEffect(() => {
    void loadRecovery();
    const timer = window.setInterval(() => void loadRecovery(), 2000);
    return () => window.clearInterval(timer);
  }, [loadRecovery]);

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

  const handleCopy = async (entry: OutgoingRecoveryEntry) => {
    await navigator.clipboard.writeText(entry.content);
  };

  const handleClear = async (id: string) => {
    await clearOutgoingRecoveryEntry(id);
    await loadRecovery();
  };

  const handleClearAll = async () => {
    await clearAllOutgoingRecovery();
    await loadRecovery();
  };

  const pendingCount = recoveryEntries.filter((entry) => entry.status === 'pending').length;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-400" /> Chat & Editor
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
              Lightweight formatting, durable drafts, recovery behaviour, and transparent memory controls for the message workspace.
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

        <MemoryTransparencySettingsPanel />

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

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Clipboard className="h-4 w-4 text-sky-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-zinc-200">Sent-message recovery</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">A small local recovery buffer protects recently sent text if the app closes during delivery.</p>
              </div>
            </div>
            {pendingCount > 0 && <span className="shrink-0 rounded-full border border-amber-700/40 bg-amber-950/40 px-2 py-0.5 text-[10px] text-amber-300">{pendingCount} pending</span>}
          </div>

          {recoveryEntries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-4 text-center text-[11px] text-zinc-600">No recent recovery entries.</p>
          ) : (
            <div className="space-y-2">
              {recoveryEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span>{new Date(entry.createdAt).toLocaleString()}</span><span>•</span>
                        <span className={entry.status === 'pending' ? 'text-amber-400' : entry.status === 'failed' ? 'text-red-400' : 'text-emerald-400'}>{entry.status === 'pending' ? 'Pending' : entry.status === 'failed' ? 'Needs attention' : 'Saved'}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">{entry.content}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => restoreToComposer(entry.content)} className="rounded-lg border border-zinc-700/70 bg-zinc-800 px-2 py-1.5 text-[10px] text-zinc-200 hover:bg-zinc-700">Restore</button>
                      <button type="button" onClick={() => void handleCopy(entry)} className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-zinc-200" title="Copy recovery text"><Copy className="h-3 w-3" /></button>
                      <button type="button" onClick={() => void handleClear(entry.id)} className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-red-300" title="Remove recovery entry"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => void handleClearAll()} className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300"><Trash2 className="h-3 w-3" /> Clear recovery buffer</button>
            </div>
          )}

          <p className="text-[10px] leading-relaxed text-zinc-600">Recovery data stays local to this browser/profile and is automatically pruned after 7 days. Elara never sends the recovery buffer to Gemini on its own.</p>
        </div>
      </section>
    </div>
  );
};
