import React, { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, ExternalLink, Loader2, X } from 'lucide-react';
import { buildDiagnosticsSnapshot, resolveDiagnosticsRange, type DiagnosticsPeriod, type DiagnosticsReport } from '../lib/resilienceAnalysis';
import { getResilienceDiagnosticHistory } from '../lib/resilienceDiagnostics';
import { normalizeReliabilitySettings, type ReliabilitySettings } from '../lib/reliabilitySettings';

interface Props {
  settings: ReliabilitySettings | undefined;
  preferredModel: string;
  onClose: () => void;
}

const PERIODS: Array<{ id: DiagnosticsPeriod; label: string }> = [
  { id: 'last-hour', label: 'Last hour' },
  { id: 'today', label: 'Today' },
  { id: 'last-7-days', label: 'Last 7 days' },
  { id: 'last-30-days', label: 'Last 30 days' },
];

export const ResilienceAnalysisPanel: React.FC<Props> = ({ settings, preferredModel, onClose }) => {
  const [period, setPeriod] = useState<DiagnosticsPeriod>('last-7-days');
  const [checkOnline, setCheckOnline] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedSettings = useMemo(() => normalizeReliabilitySettings(settings), [settings]);

  const analyse = async () => {
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const range = resolveDiagnosticsRange(
        period,
        period === 'custom' && customStart ? new Date(customStart).getTime() : undefined,
        period === 'custom' && customEnd ? new Date(customEnd).getTime() : undefined,
      );
      const snapshot = buildDiagnosticsSnapshot(range, normalizedSettings, getResilienceDiagnosticHistory());
      const response = await fetch('/api/diagnostics/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot, checkOnline, model: preferredModel }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Diagnostics analysis failed.');
      setReport({
        id: `diag-report-${Date.now()}`,
        generatedAt: Date.now(),
        modelUsed: payload.modelUsed || preferredModel,
        period: range,
        observed: payload.report?.observed || [],
        inferred: payload.report?.inferred || [],
        externalEvidence: payload.externalEvidence || [],
        recommendations: payload.report?.recommendations || [],
        uncertainty: payload.report?.uncertainty || [],
        sourceEventCount: snapshot.events.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Diagnostics analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Model diagnostics analysis">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-400" />
            <div><h2 className="text-sm font-semibold text-zinc-100">Analyse recent model behaviour</h2><p className="text-[10px] text-zinc-500">Local routing evidence first; online evidence is always explicit.</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close analysis" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PERIODS.map((item) => <button key={item.id} type="button" aria-pressed={period === item.id} onClick={() => setPeriod(item.id)} className={`rounded-lg border px-2.5 py-2 text-[10px] font-medium ${period === item.id ? 'border-sky-700 bg-sky-950/40 text-sky-300' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}>{item.label}</button>)}
              <button type="button" aria-pressed={period === 'custom'} onClick={() => setPeriod('custom')} className={`rounded-lg border px-2.5 py-2 text-[10px] font-medium ${period === 'custom' ? 'border-sky-700 bg-sky-950/40 text-sky-300' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}>Custom</button>
            </div>
            {period === 'custom' && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="text-[10px] text-zinc-500">Start<input type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100" /></label><label className="text-[10px] text-zinc-500">End<input type="datetime-local" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100" /></label></div>}
            <label className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5"><span><span className="block text-[11px] font-medium text-zinc-200">Check online</span><span className="block text-[10px] text-zinc-600">Explicitly add public Google Cloud Service Health evidence.</span></span><input type="checkbox" checked={checkOnline} onChange={(e) => setCheckOnline(e.target.checked)} className="accent-sky-500" /></label>
            <button type="button" onClick={analyse} disabled={loading || (period === 'custom' && (!customStart || !customEnd))} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2.5 text-xs font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}{loading ? 'Analysing…' : 'Analyse'}</button>
            {error && <p className="rounded-lg border border-red-900/50 bg-red-950/20 p-2.5 text-[10px] text-red-300">{error}</p>}
          </div>

          {report && <article className="space-y-4">
            <div className="rounded-xl border border-sky-900/50 bg-sky-950/20 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-zinc-100"><CheckCircle2 className="h-4 w-4 text-emerald-400" />Report generated</div><p className="mt-1 text-[10px] text-zinc-500">Model: {report.modelUsed} · {new Date(report.generatedAt).toLocaleString()} · {report.sourceEventCount} source events</p></div>
            {([
              ['OBSERVED', report.observed],
              ['INFERRED', report.inferred],
              ['EXTERNAL EVIDENCE', report.externalEvidence.map((item) => `${item.title}: ${item.summary}`)],
              ['RECOMMENDATION', report.recommendations],
              ['UNCERTAINTY', report.uncertainty],
            ] as const).map(([title, items]) => <section key={title} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"><h3 className="text-[10px] font-bold tracking-[0.14em] text-sky-300">{title}</h3>{items.length ? <div className="mt-2 space-y-2">{items.map((item, index) => <p key={`${title}-${index}`} className="text-xs leading-relaxed text-zinc-300">{item}</p>)}</div> : <p className="mt-2 text-[10px] text-zinc-600">No material findings in this category.</p>}{title === 'EXTERNAL EVIDENCE' && report.externalEvidence.length > 0 && <a href={report.externalEvidence[0].url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-sky-400 hover:text-sky-300">Open source <ExternalLink className="h-3 w-3" /></a>}</section>)}
          </article>}
        </div>
      </div>
    </div>
  );
};
