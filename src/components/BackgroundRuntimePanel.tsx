import React, { useState } from 'react';
import { CheckCircle2, CloudCog, Loader2, Save, Shield, X } from 'lucide-react';
import {
  getBackgroundRuntimeConfig,
  getBackgroundChatJob,
  saveBackgroundRuntimeConfig,
} from '../lib/backgroundChatClient';

interface BackgroundRuntimePanelProps {
  onClose: () => void;
}

export const BackgroundRuntimePanel: React.FC<BackgroundRuntimePanelProps> = ({ onClose }) => {
  const existing = getBackgroundRuntimeConfig();
  const [url, setUrl] = useState(existing?.baseUrl || '');
  const [token, setToken] = useState(existing?.token || '');
  const [message, setMessage] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const save = () => {
    saveBackgroundRuntimeConfig({ baseUrl: url, token });
    setMessage('Background runtime configuration saved on this device.');
  };

  const test = async () => {
    setTesting(true);
    setMessage(null);
    try {
      saveBackgroundRuntimeConfig({ baseUrl: url, token });
      const probeId = `elara-background-probe-${Date.now()}`;
      await getBackgroundChatJob(probeId);
      setMessage('Connection is reachable.');
    } catch (error: any) {
      const text = String(error?.message || error || 'Connection test failed.');
      setMessage(text.includes('404') || text.includes('Not found')
        ? 'Runtime reached successfully, but the probe job was not found — that means the endpoint and token were accepted.'
        : text);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex h-[100dvh] w-full flex-col bg-[#09090b] text-zinc-100">
      <header className="flex min-h-14 items-center gap-3 border-b border-zinc-800 bg-[#0d0d0f]/95 px-3 backdrop-blur-xl">
        <button onClick={onClose} className="h-9 w-9 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="Close">
          <X className="mx-auto h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold"><CloudCog className="h-4 w-4 text-violet-400" /> Durable background runtime</div>
          <div className="text-[10px] text-zinc-500">Lets Elara continue work after the tab disappears.</div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-xl space-y-5">
          <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
              <p className="text-xs leading-5 text-zinc-400">This is a personal-use bearer token for the current single-user stage. It is stored locally in this browser and should not be reused as a public multi-user authentication scheme.</p>
            </div>
          </section>

          <label className="block">
            <span className="text-xs font-medium text-zinc-300">Worker URL</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://elara-background-runtime.example.workers.dev" className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-violet-500/50" />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-zinc-300">Background token</span>
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Bearer token configured in Cloudflare" className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-violet-500/50" />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={save} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500"><Save className="h-4 w-4" /> Save</button>
            <button disabled={testing || !url || !token} onClick={test} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Test connection
            </button>
          </div>

          {message && <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-xs leading-5 text-zinc-400">{message}</div>}
        </div>
      </main>
    </div>
  );
};
