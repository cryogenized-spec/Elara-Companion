import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, RotateCcw, ShieldAlert, Timer, Zap } from 'lucide-react';
import type { ElaraSettings } from '../types';
import type { ReliabilitySettings } from '../lib/reliabilitySettings';
import { DEFAULT_RELIABILITY_SETTINGS, RELIABILITY_FALLBACK_MODELS, normalizeReliabilitySettings } from '../lib/reliabilitySettings';
import type { ElaraApiErrorCode } from '../lib/apiError';

interface ReliabilitySettingsPanelProps {
  settings: ReliabilitySettings | undefined;
  preferredModel: string;
  onApply: (reliabilitySettings: ReliabilitySettings) => void;
  onClose: () => void;
}

const MODEL_LABELS: Record<string, string> = {
  'gemini-3.6-flash': 'Gemini 3.6 Flash',
  'gemini-3.5-flash': 'Gemini 3.5 Flash',
  'gemini-3.5-flash-lite': 'Gemini 3.5 Flash-Lite',
};

const ERROR_OPTIONS: Array<{ code: ElaraApiErrorCode; label: string; description: string; group: 'retry' | 'failover' }> = [
  { code: 'API_RATE_LIMIT_RPM_429', label: 'Rate limit / 429', description: 'Temporary request-rate pressure.', group: 'retry' },
  { code: 'REQUEST_TIMEOUT_408', label: 'Request timeout / 408', description: 'The request did not complete in time.', group: 'retry' },
  { code: 'NETWORK_ERROR', label: 'Network failure', description: 'Connection interruption before a response completes.', group: 'retry' },
  { code: 'SERVER_ERROR_500', label: 'Server error / 500', description: 'Transient upstream failure.', group: 'retry' },
  { code: 'BAD_GATEWAY_502', label: 'Bad gateway / 502', description: 'Gateway could not reach the upstream service.', group: 'retry' },
  { code: 'SERVICE_UNAVAILABLE_503', label: 'Service unavailable / 503', description: 'Gemini is temporarily unavailable or congested.', group: 'retry' },
  { code: 'GATEWAY_TIMEOUT_504', label: 'Gateway timeout / 504', description: 'An upstream gateway timed out.', group: 'retry' },
  { code: 'API_QUOTA_DAILY_429', label: 'Daily quota exhausted', description: 'The project/account quota is exhausted; retries usually will not help.', group: 'failover' },
  { code: 'MODEL_NOT_FOUND_404', label: 'Model unavailable / 404', description: 'The configured model cannot be used.', group: 'failover' },
];

const formatMs = (value: number) => {
  if (value < 1000) return `${value} ms`;
  const seconds = value / 1000;
  return Number.isInteger(seconds) ? `${seconds} s` : `${seconds.toFixed(1)} s`;
};

const Toggle: React.FC<{ checked: boolean; onChange: (value: boolean) => void; label: string; description: string }> = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
    <div className="min-w-0">
      <p className="text-xs font-semibold text-zinc-200">{label}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{description}</p>
    </div>
    <button
      type="button"
      aria-label={label}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-sky-600' : 'bg-zinc-800'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);

export const ReliabilitySettingsPanel: React.FC<ReliabilitySettingsPanelProps> = ({ settings, preferredModel, onApply, onClose }) => {
  const [draft, setDraft] = useState<ReliabilitySettings>(() => normalizeReliabilitySettings(settings));

  const selectedFallbacks = useMemo(() => new Set(draft.fallbackModels), [draft.fallbackModels]);

  const update = (patch: Partial<ReliabilitySettings>) => setDraft((current) => normalizeReliabilitySettings({ ...current, ...patch }));

  const applyProfile = (profile: 'balanced' | 'resilient' | 'conservative') => {
    if (profile === 'balanced') {
      update({ ...DEFAULT_RELIABILITY_SETTINGS });
      return;
    }
    if (profile === 'resilient') {
      update({
        ...DEFAULT_RELIABILITY_SETTINGS,
        maxAttempts: 4,
        baseDelayMs: 1000,
        maxDelayMs: 45000,
        cooldownMs: 30000,
        autoRestorePreferredModel: true,
      });
      return;
    }
    update({
      ...DEFAULT_RELIABILITY_SETTINGS,
      maxAttempts: 2,
      baseDelayMs: 1500,
      maxDelayMs: 20000,
      cooldownMs: 5 * 60_000,
      autoRestorePreferredModel: false,
    });
  };

  const toggleErrorCode = (kind: 'retryableErrorCodes' | 'failoverErrorCodes', code: ElaraApiErrorCode) => {
    const current = new Set(draft[kind]);
    if (current.has(code)) current.delete(code);
    else current.add(code);
    update({ [kind]: Array.from(current) } as Pick<ReliabilitySettings, typeof kind>);
  };

  const toggleFallback = (model: string) => {
    const next = draft.fallbackModels.includes(model)
      ? draft.fallbackModels.filter((item) => item !== model)
      : [...draft.fallbackModels, model];
    update({ fallbackModels: next });
  };

  const moveFallback = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= draft.fallbackModels.length) return;
    const next = [...draft.fallbackModels];
    [next[index], next[target]] = [next[target], next[index]];
    update({ fallbackModels: next });
  };

  const reset = () => setDraft(normalizeReliabilitySettings(DEFAULT_RELIABILITY_SETTINGS));

  return (
    <aside className="fixed right-3 top-3 bottom-3 z-[90] flex w-[min(430px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-[#111113] shadow-2xl shadow-black/50">
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/70 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-zinc-100">Reliability & Failover</h2>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Control how Elara recovers from Gemini outages without changing your preferred model.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">Close</button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ['balanced', 'Balanced'],
            ['resilient', 'Resilient'],
            ['conservative', 'Conservative'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => applyProfile(id as 'balanced' | 'resilient' | 'conservative')}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-[10px] font-medium text-zinc-300 hover:border-sky-700 hover:bg-sky-950/30 hover:text-sky-300"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className="rounded-xl border border-sky-900/50 bg-sky-950/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-sky-300">Preferred model</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">{MODEL_LABELS[preferredModel] || preferredModel}</p>
          <p className="mt-1 text-[11px] text-zinc-500">Failover never overwrites this preference.</p>
        </div>

        <Toggle
          checked={draft.autoRetryEnabled}
          onChange={(value) => update({ autoRetryEnabled: value })}
          label="Automatic retry"
          description="Retry transient failures before switching models."
        />
        <Toggle
          checked={draft.autoFailoverEnabled}
          onChange={(value) => update({ autoFailoverEnabled: value })}
          label="Automatic model failover"
          description="Temporarily use the next healthy fallback when the preferred model is unavailable."
        />
        <Toggle
          checked={draft.autoRestorePreferredModel}
          onChange={(value) => update({ autoRestorePreferredModel: value })}
          label="Automatically restore preferred model"
          description="After its cooldown, probe the preferred model and return to it when healthy."
        />
        <Toggle
          checked={draft.honorRetryAfter}
          onChange={(value) => update({ honorRetryAfter: value })}
          label="Honor server retry timing"
          description="Respect Gemini's Retry-After guidance when it is supplied."
        />

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-200">Retry attempts</p>
              <p className="text-[11px] text-zinc-500">Maximum total attempts on the same model.</p>
            </div>
            <span className="font-mono text-xs text-sky-400">{draft.maxAttempts}</span>
          </div>
          <input type="range" min="1" max="5" step="1" value={draft.maxAttempts} onChange={(e) => update({ maxAttempts: Number(e.target.value) })} className="w-full accent-sky-500" />
          <div className="flex justify-between text-[10px] text-zinc-600"><span>1</span><span>3 (Default)</span><span>5</span></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="flex items-center gap-2"><Timer className="h-3.5 w-3.5 text-sky-400" /><span className="text-xs font-semibold text-zinc-200">Base delay</span></div>
            <input type="range" min="0" max="5000" step="250" value={draft.baseDelayMs} onChange={(e) => update({ baseDelayMs: Number(e.target.value) })} className="mt-3 w-full accent-sky-500" />
            <p className="mt-1 text-right font-mono text-[10px] text-sky-400">{formatMs(draft.baseDelayMs)}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="flex items-center gap-2"><Timer className="h-3.5 w-3.5 text-sky-400" /><span className="text-xs font-semibold text-zinc-200">Cooldown</span></div>
            <input type="range" min="0" max="300000" step="15000" value={draft.cooldownMs} onChange={(e) => update({ cooldownMs: Number(e.target.value) })} className="mt-3 w-full accent-sky-500" />
            <p className="mt-1 text-right font-mono text-[10px] text-sky-400">{formatMs(draft.cooldownMs)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
          <div className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-amber-400" /><p className="text-xs font-semibold text-zinc-200">Fallback model order</p></div>
          <p className="mt-1 text-[11px] text-zinc-500">Only enabled models can be used; first healthy entry wins.</p>
          <div className="mt-3 space-y-2">
            {RELIABILITY_FALLBACK_MODELS.map((model) => {
              const enabled = selectedFallbacks.has(model);
              const index = draft.fallbackModels.indexOf(model);
              return (
                <div key={model} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${enabled ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-900 bg-zinc-950/40 opacity-60'}`}>
                  <input type="checkbox" checked={enabled} onChange={() => toggleFallback(model)} className="accent-sky-500" />
                  <span className="flex-1 text-xs text-zinc-200">{MODEL_LABELS[model]}</span>
                  {enabled && <span className="font-mono text-[10px] text-zinc-500">#{index + 1}</span>}
                  <button type="button" disabled={!enabled || index <= 0} onClick={() => moveFallback(index, -1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={!enabled || index === draft.fallbackModels.length - 1} onClick={() => moveFallback(index, 1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5" /></button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-3">
          <div><p className="text-xs font-semibold text-zinc-200">Retry / failover conditions</p><p className="mt-1 text-[11px] text-zinc-500">Choose which classified failures are allowed to trigger recovery behavior.</p></div>
          {ERROR_OPTIONS.map((item) => {
            const key = item.group === 'retry' ? 'retryableErrorCodes' : 'failoverErrorCodes';
            const checked = draft[key].includes(item.code);
            return (
              <label key={`${item.group}-${item.code}`} className="flex items-start gap-2.5 rounded-lg border border-zinc-900 bg-zinc-950/50 p-2.5 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={() => toggleErrorCode(key, item.code)} className="mt-0.5 accent-sky-500" />
                <span className="min-w-0"><span className="block text-[11px] font-medium text-zinc-200">{item.label}</span><span className="block text-[10px] leading-relaxed text-zinc-600">{item.description}</span></span>
              </label>
            );
          })}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
          <p className="text-xs font-semibold text-zinc-200">Advanced backoff</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-[11px] text-zinc-500">Maximum delay
              <input type="number" min="0" max="120000" value={draft.maxDelayMs} onChange={(e) => update({ maxDelayMs: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100" />
            </label>
            <label className="text-[11px] text-zinc-500">Jitter
              <input type="number" min="0" max="1" step="0.05" value={draft.jitterRatio} onChange={(e) => update({ jitterRatio: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100" />
            </label>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/70 px-4 py-3 flex items-center justify-between gap-3">
        <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"><RotateCcw className="h-3.5 w-3.5" /> Reset defaults</button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">Cancel</button>
          <button type="button" onClick={() => { onApply(normalizeReliabilitySettings(draft)); onClose(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"><CheckCircle2 className="h-3.5 w-3.5" /> Apply</button>
        </div>
      </div>
    </aside>
  );
};
