import React, { useState } from 'react';
import { CloudCog, Save, Power, Wifi } from 'lucide-react';
import {
  getBackgroundRuntimeConfig,
  isBackgroundRuntimeEnabled,
  saveBackgroundRuntimeConfig,
  setBackgroundRuntimeEnabled,
} from '../lib/backgroundChatClient';

export const DurableBackgroundPanel: React.FC = () => {
  const existing = getBackgroundRuntimeConfig();
  const [url, setUrl] = useState(existing?.baseUrl || '');
  const [token, setToken] = useState(existing?.token || '');
  const [enabled, setEnabled] = useState(isBackgroundRuntimeEnabled());
  const [saved, setSaved] = useState(false);

  const save = () => {
    const trimmedUrl = url.trim().replace(/\/+$/, '');
    const trimmedToken = token.trim();
    saveBackgroundRuntimeConfig(trimmedUrl && trimmedToken ? { baseUrl: trimmedUrl, token: trimmedToken } : null);
    setBackgroundRuntimeEnabled(enabled && Boolean(trimmedUrl && trimmedToken));
    setEnabled(enabled && Boolean(trimmedUrl && trimmedToken));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setBackgroundRuntimeEnabled(next);
  };

  return (
    <section className="mx-auto w-full max-w-2xl space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300"><CloudCog className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-zinc-100">Durable background execution</div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">When enabled, supported chats run on Elara's server-side runtime and can continue after this page is closed.</p>
          </div>
          <button onClick={toggle} className={`inline-flex h-9 min-w-16 items-center justify-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold ${enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-950 text-zinc-500'}`}><Power className="h-3.5 w-3.5" />{enabled ? 'On' : 'Off'}</button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <label className="block text-[11px] font-semibold text-zinc-400">Worker URL</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://elara-background-runtime.example.workers.dev" className="mt-2 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200 outline-none focus:border-violet-500/50" inputMode="url" autoCapitalize="none" spellCheck={false} />
        <label className="mt-4 block text-[11px] font-semibold text-zinc-400">Personal-use runtime token</label>
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the ELARA_BACKGROUND_TOKEN value" className="mt-2 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200 outline-none focus:border-violet-500/50" type="password" autoCapitalize="none" spellCheck={false} />
        <div className="mt-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-[10px] text-zinc-600"><Wifi className="h-3.5 w-3.5" /><span>Personal single-user runtime</span></div><button onClick={save} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-500"><Save className="h-3.5 w-3.5" />{saved ? 'Saved' : 'Save'}</button></div>
      </div>

      <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 text-xs leading-5 text-zinc-500"><strong className="text-amber-300">Current scope:</strong> durable text generation only. Normal tool-enabled Elara chat remains unchanged while this mode is off.</div>
    </section>
  );
};
