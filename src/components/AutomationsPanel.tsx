import React, { useEffect, useMemo, useState } from 'react';
import { X, Plus, Play, Pause, Pencil, Trash2, Clock3, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

type AutomationFrequency = 'once' | 'daily' | 'weekly' | 'monthly';
type AutomationStatus = 'idle' | 'queued' | 'running' | 'success' | 'failed';

type AutomationRun = {
  id: string;
  startedAt: string;
  status: AutomationStatus;
  attempts: number;
  message?: string;
};

type Automation = {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
  frequency: AutomationFrequency;
  date: string;
  time: string;
  timezone: string;
  retryAttempts: number;
  retryDelaySeconds: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: AutomationStatus;
  runs: AutomationRun[];
};

const STORAGE_KEY = 'elara_automations_v1';
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const makeId = () => `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const calculateNextRun = (frequency: AutomationFrequency, date: string, time: string) => {
  if (!date || !time) return null;
  const candidate = new Date(`${date}T${time}:00`);
  if (Number.isNaN(candidate.getTime())) return null;
  if (frequency === 'once') return candidate.toISOString();
  const now = new Date();
  while (candidate.getTime() <= now.getTime()) {
    if (frequency === 'daily') candidate.setDate(candidate.getDate() + 1);
    if (frequency === 'weekly') candidate.setDate(candidate.getDate() + 7);
    if (frequency === 'monthly') candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate.toISOString();
};

const nextRunLabel = (automation: Automation) => {
  if (!automation.nextRunAt) return 'Not scheduled';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(automation.nextRunAt));
};

const blankAutomation = (): Automation => ({
  id: makeId(), name: 'New Automation', prompt: '', enabled: true, frequency: 'daily',
  date: new Date().toISOString().slice(0, 10), time: '07:30', timezone: TIMEZONE,
  retryAttempts: 3, retryDelaySeconds: 10, nextRunAt: null, lastRunAt: null,
  lastStatus: 'idle', runs: [],
});

const statusMeta: Record<AutomationStatus, { label: string; icon: React.ReactNode }> = {
  idle: { label: 'Ready', icon: <Clock3 className="w-3.5 h-3.5" /> },
  queued: { label: 'Queued', icon: <RotateCcw className="w-3.5 h-3.5" /> },
  running: { label: 'Running', icon: <RotateCcw className="w-3.5 h-3.5 animate-spin" /> },
  success: { label: 'Success', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  failed: { label: 'Failed', icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

export const AutomationsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAutomations(JSON.parse(raw));
    } catch (error) {
      console.warn('[Automations] Failed to load stored automations', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(automations));
  }, [automations, loaded]);

  const sorted = useMemo(() => [...automations].sort((a, b) => (a.nextRunAt || '').localeCompare(b.nextRunAt || '')), [automations]);

  const saveAutomation = (draft: Automation) => {
    const normalized = {
      ...draft,
      nextRunAt: draft.enabled ? calculateNextRun(draft.frequency, draft.date, draft.time) : null,
    };
    setAutomations((current) => current.some((item) => item.id === normalized.id)
      ? current.map((item) => item.id === normalized.id ? normalized : item)
      : [normalized, ...current]);
    setEditing(null);
  };

  const runNow = (automation: Automation) => {
    const run: AutomationRun = {
      id: makeId(), startedAt: new Date().toISOString(), status: 'queued', attempts: 0,
      message: 'Execution engine will be connected in the next automation pass.',
    };
    setAutomations((current) => current.map((item) => item.id === automation.id
      ? { ...item, lastRunAt: run.startedAt, lastStatus: 'queued', runs: [run, ...item.runs].slice(0, 10) }
      : item));
  };

  const toggleEnabled = (automation: Automation) => {
    setAutomations((current) => current.map((item) => item.id === automation.id ? {
      ...item,
      enabled: !item.enabled,
      nextRunAt: !item.enabled ? calculateNextRun(item.frequency, item.date, item.time) : null,
    } : item));
  };

  const deleteAutomation = (id: string) => {
    setAutomations((current) => current.filter((item) => item.id !== id));
    if (editing?.id === id) setEditing(null);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end md:items-stretch md:justify-end">
      <div className="w-full md:w-[520px] h-[92vh] md:h-full bg-[#101010] border-t md:border-l border-zinc-800 rounded-t-3xl md:rounded-none shadow-2xl flex flex-col overflow-hidden">
        <header className="px-4 py-4 border-b border-zinc-800 flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2"><Clock3 className="w-5 h-5 text-sky-400" /><h2 className="text-base font-semibold text-zinc-100">Automations</h2></div>
            <p className="text-xs text-zinc-500 mt-1">Schedule prompts for Elara to run automatically.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" title="Close"><X className="w-5 h-5" /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {sorted.length === 0 ? (
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4"><Clock3 className="w-7 h-7" /></div>
              <h3 className="text-sm font-semibold text-zinc-100">Nothing scheduled yet</h3>
              <p className="text-xs text-zinc-500 mt-2 max-w-sm">Create your first automation. This pass gives you the control panel; the GitHub execution worker comes next.</p>
              <button onClick={() => setEditing(blankAutomation())} className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium"><Plus className="w-4 h-4" /> New automation</button>
            </div>
          ) : sorted.map((automation) => {
            const meta = statusMeta[automation.lastStatus];
            return (
              <article key={automation.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-zinc-100 truncate">{automation.name}</h3><span className={`text-[10px] px-1.5 py-0.5 rounded border ${automation.enabled ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-zinc-500 border-zinc-700 bg-zinc-800/50'}`}>{automation.enabled ? 'Enabled' : 'Paused'}</span></div>
                    <p className="text-xs text-zinc-500 mt-1">{automation.frequency} · {automation.time} · {automation.timezone}</p>
                  </div>
                  <button onClick={() => toggleEnabled(automation)} className="text-xs text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded-lg hover:bg-zinc-800">{automation.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
                </div>
                <div className="mt-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3"><p className="text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap line-clamp-4">{automation.prompt || 'No prompt yet.'}</p></div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-2.5"><div className="text-zinc-500">Next run</div><div className="text-zinc-200 mt-1 truncate">{nextRunLabel(automation)}</div></div>
                  <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-2.5"><div className="text-zinc-500">Last status</div><div className="text-zinc-200 mt-1 flex items-center gap-1.5">{meta.icon}{meta.label}</div></div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => runNow(automation)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-sky-600/15 border border-sky-500/20 text-sky-300 hover:bg-sky-600/25 text-xs font-medium"><Play className="w-3.5 h-3.5" /> Run now</button>
                  <button onClick={() => setEditing(automation)} className="p-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteAutomation(automation.id)} className="p-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-800" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
                {automation.runs.length > 0 && <div className="mt-3 pt-3 border-t border-zinc-800"><div className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-2">Recent runs</div><div className="space-y-1.5">{automation.runs.slice(0, 3).map((run) => <div key={run.id} className="flex items-center justify-between text-[11px] text-zinc-500"><span>{new Date(run.startedAt).toLocaleString()}</span><span className="text-zinc-400 capitalize">{run.status}</span></div>)}</div></div>}
              </article>
            );
          })}
        </div>

        {sorted.length > 0 && <div className="px-4 pb-4 pt-2 border-t border-zinc-800 shrink-0"><button onClick={() => setEditing(blankAutomation())} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium"><Plus className="w-4 h-4" /> New automation</button></div>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-end md:items-center md:justify-center p-0 md:p-4">
          <div className="w-full md:max-w-xl max-h-[94vh] overflow-y-auto bg-[#111] border border-zinc-800 rounded-t-3xl md:rounded-3xl shadow-2xl p-4 md:p-6">
            <div className="flex items-center justify-between gap-3 mb-5"><div><h3 className="text-base font-semibold text-zinc-100">{automations.some((item) => item.id === editing.id) ? 'Edit automation' : 'New automation'}</h3><p className="text-xs text-zinc-500 mt-1">Tell Elara what to do, then choose when.</p></div><button onClick={() => setEditing(null)} className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"><X className="w-4 h-4" /></button></div>
            <div className="space-y-4">
              <label className="block"><span className="text-xs text-zinc-400">Name</span><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-sky-500/60" /></label>
              <label className="block"><span className="text-xs text-zinc-400">Prompt</span><textarea value={editing.prompt} onChange={(e) => setEditing({ ...editing, prompt: e.target.value })} rows={6} placeholder="Check my unread emails and calendar. Give me a concise morning briefing and highlight anything urgent." className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm leading-relaxed text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-sky-500/60 resize-none" /></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block"><span className="text-xs text-zinc-400">Frequency</span><select value={editing.frequency} onChange={(e) => setEditing({ ...editing, frequency: e.target.value as AutomationFrequency })} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100"><option value="once">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
                <label className="block"><span className="text-xs text-zinc-400">Time</span><input type="time" value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100" /></label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block"><span className="text-xs text-zinc-400">Starting date</span><input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100" /></label>
                <label className="block"><span className="text-xs text-zinc-400">Timezone</span><input value={editing.timezone} onChange={(e) => setEditing({ ...editing, timezone: e.target.value })} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100" /></label>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3.5"><div className="text-xs font-medium text-zinc-300">Retry policy</div><div className="grid grid-cols-2 gap-3 mt-3"><label className="block"><span className="text-[11px] text-zinc-500">Attempts</span><input type="number" min={1} max={3} value={editing.retryAttempts} onChange={(e) => setEditing({ ...editing, retryAttempts: Math.min(3, Math.max(1, Number(e.target.value))) })} className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100" /></label><label className="block"><span className="text-[11px] text-zinc-500">Delay (seconds)</span><input type="number" min={5} max={60} value={editing.retryDelaySeconds} onChange={(e) => setEditing({ ...editing, retryDelaySeconds: Math.min(60, Math.max(5, Number(e.target.value))) })} className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100" /></label></div></div>
              <label className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3.5"><div><div className="text-sm text-zinc-200">Enabled</div><div className="text-[11px] text-zinc-500 mt-0.5">Allow the scheduler to pick this automation up.</div></div><button type="button" onClick={() => setEditing({ ...editing, enabled: !editing.enabled })} className={`w-12 h-7 rounded-full p-1 transition-colors ${editing.enabled ? 'bg-sky-600' : 'bg-zinc-700'}`}><span className={`block w-5 h-5 rounded-full bg-white transition-transform ${editing.enabled ? 'translate-x-5' : ''}`} /></button></label>
            </div>
            <div className="flex items-center gap-2 mt-6"><button onClick={() => setEditing(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-sm">Cancel</button><button disabled={!editing.name.trim() || !editing.prompt.trim()} onClick={() => saveAutomation(editing)} className="flex-1 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">Save automation</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
