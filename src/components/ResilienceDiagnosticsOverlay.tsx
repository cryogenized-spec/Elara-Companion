import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Bug, ChevronDown, X } from 'lucide-react';
import { getDbSettings } from '../lib/db';
import type { ResilienceDiagnosticEvent, ResilienceDiagnosticLevel } from '../lib/resilienceDiagnostics';
import { formatResilienceDiagnosticTime, getResilienceDiagnosticHistory, subscribeResilienceDiagnostics } from '../lib/resilienceDiagnostics';
import { normalizeReliabilitySettings } from '../lib/reliabilitySettings';
import type { ElaraSettings } from '../types';
import { ResilienceAnalysisPanel } from './ResilienceAnalysisPanel';

const FRIENDLY_REASON: Record<string, string> = {
  API_RATE_LIMIT_RPM_429: 'Rate limit / 429',
  API_QUOTA_DAILY_429: 'Quota exhausted / 429',
  MODEL_NOT_FOUND_404: 'Model unavailable / 404',
  SERVER_ERROR_500: 'Server failure / 500',
  BAD_GATEWAY_502: 'Gateway failure / 502',
  SERVICE_UNAVAILABLE_503: 'Provider unavailable / 503',
  GATEWAY_TIMEOUT_504: 'Gateway timeout / 504',
  REQUEST_TIMEOUT_408: 'Timeout / 408',
  NETWORK_ERROR: 'Network failure',
  UNKNOWN_API_ERROR: 'Unknown provider error',
};

const levelLabels: Record<ResilienceDiagnosticLevel, string> = {
  off: 'Off',
  basic: 'Basic',
  detailed: 'Detailed',
  debug: 'Debug',
};

export const ResilienceDiagnosticsOverlay: React.FC = () => {
  const [settings, setSettings] = useState<ElaraSettings | null>(null);
  const [events, setEvents] = useState<ResilienceDiagnosticEvent[]>(getResilienceDiagnosticHistory());
  const [collapsed, setCollapsed] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getDbSettings().then((next) => { if (mounted) setSettings(next); }).catch(() => undefined);
    const onSettings = (event: Event) => {
      const detail = (event as CustomEvent<{ settings?: ElaraSettings }>).detail;
      if (detail?.settings) setSettings(detail.settings);
    };
    window.addEventListener('elara-settings-changed', onSettings);
    return () => { mounted = false; window.removeEventListener('elara-settings-changed', onSettings); };
  }, []);

  useEffect(() => subscribeResilienceDiagnostics((event) => {
    setEvents((current) => [...current.slice(-199), event]);
  }), []);

  const level = normalizeReliabilitySettings(settings?.reliabilitySettings).diagnosticLevel;
  const latestRoute = useMemo(() => [...events].reverse().find((event) => event.kind === 'ROUTE'), [events]);
  const latestError = useMemo(() => [...events].reverse().find((event) => event.kind === 'ERROR'), [events]);

  if (level === 'off') return null;

  if (level === 'basic') {
    if (!latestRoute) return null;
    return (
      <>
        <div className="fixed bottom-20 left-1/2 z-[80] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-zinc-700 bg-zinc-950/95 px-3.5 py-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="truncate text-xs font-semibold text-zinc-100">{latestRoute.actualModel} → {latestRoute.fallbackTarget}</p><p className="mt-0.5 text-[10px] text-zinc-500">Reason: {FRIENDLY_REASON[latestRoute.errorCode || ''] || latestRoute.errorCode || 'Provider failure'}</p></div>
            <button type="button" onClick={() => setAnalysisOpen(true)} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[9px] text-zinc-400 hover:border-sky-700 hover:text-sky-300"><BarChart3 className="h-3 w-3" /> Analyse</button>
          </div>
        </div>
        {analysisOpen && <ResilienceAnalysisPanel settings={settings?.reliabilitySettings} preferredModel={settings?.model || 'gemini-3.7-flash'} onClose={() => setAnalysisOpen(false)} />}
      </>
    );
  }

  const visibleEvents = level === 'debug' ? events.slice(-80).reverse() : events.slice(-1).reverse();
  return (
    <>
      <div className={`fixed bottom-20 right-3 z-[80] ${level === 'debug' ? 'w-[min(720px,calc(100vw-1.5rem))]' : 'w-[min(520px,calc(100vw-1.5rem))]'} rounded-2xl border border-zinc-700 bg-zinc-950/97 shadow-2xl backdrop-blur-xl`}>
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-3.5 py-3"><div className="flex min-w-0 items-center gap-2"><Bug className="h-3.5 w-3.5 text-sky-400" /><span className="text-xs font-semibold text-zinc-100">Developer diagnostics</span><span className="text-[9px] uppercase tracking-[0.15em] text-zinc-600">{levelLabels[level]}</span></div><div className="flex items-center gap-1"><button type="button" onClick={() => setAnalysisOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[9px] text-zinc-400 hover:border-sky-700 hover:text-sky-300"><BarChart3 className="h-3 w-3" /> Analyse</button><button type="button" onClick={() => setCollapsed((value) => !value)} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200" aria-label={collapsed ? 'Expand diagnostics' : 'Collapse diagnostics'}><ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? '-rotate-90' : ''}`} /></button></div></div>
        {!collapsed && <div className="max-h-[52vh] overflow-y-auto p-3 custom-scrollbar">
          {level === 'detailed' && latestError && <div className="mb-3 grid grid-cols-2 gap-2 text-[10px]">{[
            ['Selected', latestError.preferredModel], ['Actual', latestError.actualModel], ['Preference rank', `#${latestError.preferenceRank ?? '—'}`], ['Attempt', latestError.attempt ?? '—'], ['Error class', latestError.errorCode || '—'], ['HTTP status', latestError.httpStatus ?? '—'], ['Retry delay', `${latestError.retryDelayMs ?? 0} ms`], ['Fallback', latestError.fallbackAllowed ? 'allowed' : 'blocked'],
          ].map(([label, value]) => <div key={label} className="rounded-lg bg-zinc-900/80 p-2"><span className="text-zinc-600">{label}</span><p className="mt-0.5 font-mono text-zinc-200">{value}</p></div>)}</div>}
          {level === 'detailed' && latestRoute && <div className="mb-3 rounded-lg border border-sky-900/50 bg-sky-950/20 px-3 py-2 text-[10px] text-sky-200"><span className="font-mono">Route</span> {latestRoute.message}</div>}
          {level === 'debug' && <div className="space-y-1 font-mono text-[9px] leading-relaxed">{visibleEvents.map((event) => <div key={event.id} className="grid grid-cols-[82px_58px_minmax(0,1fr)] gap-2 rounded-md px-2 py-1 hover:bg-zinc-900/70"><span className="text-zinc-600">{formatResilienceDiagnosticTime(event.timestamp)}</span><span className="text-sky-400">{event.kind}</span><span className="min-w-0 break-words text-zinc-300">{event.kind === 'REQUEST' && `preferred=${event.preferredModel} attempted=${event.actualModel} attempt=${event.attempt}`}{event.kind === 'ERROR' && `status=${event.httpStatus ?? 'n/a'} classification=${event.errorCode} fallback_allowed=${event.fallbackAllowed}`}{event.kind === 'POLICY' && `fallback_allowed=${event.fallbackAllowed} class=${event.errorCode || 'n/a'} ${event.message || ''}`}{event.kind === 'ROUTE' && `${event.actualModel} → ${event.fallbackTarget}`}{event.kind === 'RETRY' && `attempt=${event.attempt} delay=${event.retryDelayMs ?? 0}ms class=${event.errorCode}`}{(event.kind === 'COOLDOWN' || event.kind === 'RECOVERY' || event.kind === 'SUCCESS') && (event.message || `model=${event.actualModel}`)}</span></div>)}</div>}
        </div>}
        {collapsed && <div className="flex items-center justify-between px-3.5 py-2 text-[9px] text-zinc-600"><span>{events.length} routing events retained</span><button type="button" onClick={() => setEvents([])} className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-zinc-900 hover:text-zinc-300"><X className="h-3 w-3" /> Clear view</button></div>}
      </div>
      {analysisOpen && <ResilienceAnalysisPanel settings={settings?.reliabilitySettings} preferredModel={settings?.model || 'gemini-3.7-flash'} onClose={() => setAnalysisOpen(false)} />}
    </>
  );
};
