import { deriveModelHealthHistory, type ResilienceModelHealthSnapshot } from './resilienceModelHealth';
import { getResilienceDiagnosticHistory, type ResilienceDiagnosticEvent } from './resilienceDiagnostics';
import type { ReliabilitySettings } from './reliabilitySettings';

export type DiagnosticsPeriod = 'last-hour' | 'today' | 'last-7-days' | 'last-30-days' | 'custom';

export interface DiagnosticsPeriodRange {
  period: DiagnosticsPeriod;
  start: number;
  end: number;
  timezone: string;
}

export interface DiagnosticsSnapshot {
  capturedAt: number;
  range: DiagnosticsPeriodRange;
  events: ResilienceDiagnosticEvent[];
  modelHealth: ResilienceModelHealthSnapshot[];
  fallbackFrequency: Record<string, number>;
  failureClassifications: Record<string, number>;
  latencyMs: Record<string, { count: number; average: number; p95?: number }>;
  preferenceOrder: string[];
  fallbackRules: {
    autoRetryEnabled: boolean;
    maxAttempts: number;
    autoFailoverEnabled: boolean;
    failoverErrorCodes: string[];
    retryableErrorCodes: string[];
    autoRestorePreferredModel: boolean;
    honorRetryAfter: boolean;
  };
}

export interface ExternalEvidence {
  source: string;
  title: string;
  checkedAt: number;
  summary: string;
  url: string;
}

export interface DiagnosticsReport {
  id: string;
  generatedAt: number;
  modelUsed: string;
  period: DiagnosticsPeriodRange;
  observed: string[];
  inferred: string[];
  externalEvidence: ExternalEvidence[];
  recommendations: string[];
  uncertainty: string[];
  sourceEventCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function timezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

export function resolveDiagnosticsRange(period: DiagnosticsPeriod, customStart?: number, customEnd?: number, now = Date.now()): DiagnosticsPeriodRange {
  const end = customEnd ?? now;
  let start = customStart ?? (end - DAY_MS);
  if (period === 'last-hour') start = end - 60 * 60 * 1000;
  if (period === 'today') {
    const d = new Date(end);
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }
  if (period === 'last-7-days') start = end - 7 * DAY_MS;
  if (period === 'last-30-days') start = end - 30 * DAY_MS;
  return { period, start, end, timezone: timezone() };
}

function percentile(values: number[], percentileValue: number): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentileValue * sorted.length) - 1));
  return sorted[index];
}

export function buildDiagnosticsSnapshot(
  range: DiagnosticsPeriodRange,
  reliabilitySettings: ReliabilitySettings,
  allEvents = getResilienceDiagnosticHistory(),
): DiagnosticsSnapshot {
  const events = allEvents.filter((event) => event.timestamp >= range.start && event.timestamp <= range.end);
  const fallbackFrequency: Record<string, number> = {};
  const failureClassifications: Record<string, number> = {};
  const latencies: Record<string, number[]> = {};

  for (const event of events) {
    if (event.fallbackTaken && event.fallbackTarget) {
      fallbackFrequency[event.fallbackTarget] = (fallbackFrequency[event.fallbackTarget] || 0) + 1;
    }
    if (event.errorCode) failureClassifications[event.errorCode] = (failureClassifications[event.errorCode] || 0) + 1;
    if (event.latencyMs !== undefined && event.actualModel) (latencies[event.actualModel] ||= []).push(event.latencyMs);
  }

  const latencyMs: DiagnosticsSnapshot['latencyMs'] = {};
  for (const [model, values] of Object.entries(latencies)) {
    latencyMs[model] = {
      count: values.length,
      average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
      p95: percentile(values, 0.95),
    };
  }

  return {
    capturedAt: Date.now(),
    range,
    events,
    modelHealth: deriveModelHealthHistory(allEvents, Date.now()),
    fallbackFrequency,
    failureClassifications,
    latencyMs,
    preferenceOrder: [...(reliabilitySettings.preferredModelOrder || [])],
    fallbackRules: {
      autoRetryEnabled: reliabilitySettings.autoRetryEnabled,
      maxAttempts: reliabilitySettings.maxAttempts,
      autoFailoverEnabled: reliabilitySettings.autoFailoverEnabled,
      failoverErrorCodes: [...reliabilitySettings.failoverErrorCodes],
      retryableErrorCodes: [...reliabilitySettings.retryableErrorCodes],
      autoRestorePreferredModel: reliabilitySettings.autoRestorePreferredModel,
      honorRetryAfter: reliabilitySettings.honorRetryAfter,
    },
  };
}

export function createDiagnosticsAnalysisPrompt(snapshot: DiagnosticsSnapshot, externalEvidence: ExternalEvidence[] = []): string {
  const safeSnapshot = {
    ...snapshot,
    events: snapshot.events.map(({ message, ...event }) => ({ ...event, message: message ? '[bounded diagnostic message omitted]' : undefined })),
  };
  return [
    'Analyse this Elara model-routing diagnostic snapshot.',
    '',
    'Use four explicit sections: OBSERVED, INFERRED, EXTERNAL EVIDENCE, RECOMMENDATION.',
    'Observed statements must describe only facts directly present in the snapshot.',
    'Inferred statements must identify patterns and uncertainty; do not claim causation from correlation.',
    'External evidence must contain only the supplied external evidence objects and must remain clearly separate from local telemetry.',
    'Recommendations may suggest policy changes but MUST NOT claim that any change has been applied.',
    'If the dataset is too small to support a meaningful conclusion, say so explicitly.',
    'Never invent missing events, provider incidents, or model behaviour.',
    'Do not expose or request credentials, tokens, prompts, or secrets.',
    '',
    'SNAPSHOT:',
    JSON.stringify(safeSnapshot),
    '',
    'EXTERNAL EVIDENCE:',
    JSON.stringify(externalEvidence),
    '',
    'Return strict JSON:',
    JSON.stringify({
      observed: ['string'],
      inferred: ['string'],
      externalEvidence: ['string'],
      recommendations: ['string'],
      uncertainty: ['string'],
    }),
  ].join('\n');
}

export function normalizeDiagnosticsReport(raw: unknown, snapshot: DiagnosticsSnapshot, modelUsed: string, externalEvidence: ExternalEvidence[]): DiagnosticsReport {
  const value = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const list = (candidate: unknown) => Array.isArray(candidate) ? candidate.filter((item): item is string => typeof item === 'string').slice(0, 20) : [];
  const id = `diag-report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const external = externalEvidence.slice(0, 10);
  return {
    id,
    generatedAt: Date.now(),
    modelUsed,
    period: snapshot.range,
    observed: list(value.observed),
    inferred: list(value.inferred),
    externalEvidence: external,
    recommendations: list(value.recommendations),
    uncertainty: list(value.uncertainty),
    sourceEventCount: snapshot.events.length,
  };
}
