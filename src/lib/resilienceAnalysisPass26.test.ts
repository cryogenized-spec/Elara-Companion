import { describe, expect, it } from 'vitest';
import { buildDiagnosticsSnapshot, createDiagnosticsAnalysisPrompt, resolveDiagnosticsRange } from './resilienceAnalysis';
import type { ReliabilitySettings } from './reliabilitySettings';
import type { ResilienceDiagnosticEvent } from './resilienceDiagnostics';

const settings: ReliabilitySettings = {
  preferredModelOrder: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'],
  autoRetryEnabled: true,
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterRatio: 0.2,
  honorRetryAfter: true,
  autoFailoverEnabled: true,
  autoRestorePreferredModel: true,
  cooldownMs: 30000,
  fallbackModels: ['gemini-3.6-flash', 'gemini-3.5-flash'],
  retryableErrorCodes: ['API_RATE_LIMIT_RPM_429'],
  failoverErrorCodes: ['API_RATE_LIMIT_RPM_429'],
  diagnosticLevel: 'off',
  skipUnhealthyFallbackModels: true,
};

function event(overrides: Partial<ResilienceDiagnosticEvent>): ResilienceDiagnosticEvent {
  return {
    id: 1,
    timestamp: Date.UTC(2026, 7, 28, 10, 0),
    timezone: 'Africa/Johannesburg',
    kind: 'SUCCESS',
    outcome: 'success',
    provider: 'google',
    sessionId: 'session-1',
    conversationId: 'conversation-1',
    requestId: 'request-1',
    preferredModel: 'gemini-3.7-flash',
    actualModel: 'gemini-3.7-flash',
    preferenceRank: 1,
    attempt: 1,
    latencyMs: 1200,
    ...overrides,
  };
}

describe('Pass 26 diagnostics analysis', () => {
  it('resolves the requested periods in local time without losing machine-readable timestamps', () => {
    const now = Date.UTC(2026, 7, 28, 16, 0);
    expect(resolveDiagnosticsRange('last-hour', undefined, undefined, now)).toMatchObject({ start: now - 3600000, end: now });
    const today = resolveDiagnosticsRange('today', undefined, undefined, now);
    expect(today.start).toBeLessThan(today.end);
    expect(today.timezone).toBeTypeOf('string');
  });

  it('filters the local event history into the requested analysis window and retains the policy snapshot', () => {
    const inside = event({ id: 2, timestamp: Date.UTC(2026, 7, 28, 15, 30), kind: 'ERROR', outcome: 'failure', errorCode: 'API_RATE_LIMIT_RPM_429', httpStatus: 429, fallbackEligible: true, fallbackAllowed: true, fallbackTaken: true, fallbackTarget: 'gemini-3.6-flash' });
    const outside = event({ id: 3, timestamp: Date.UTC(2026, 7, 27, 15, 30) });
    const range = { period: 'last-30-days' as const, start: Date.UTC(2026, 7, 1), end: Date.UTC(2026, 7, 28, 23, 59), timezone: 'Africa/Johannesburg' };
    const snapshot = buildDiagnosticsSnapshot(range, settings, [inside, outside]);
    expect(snapshot.events.map((item) => item.id)).toEqual([2, 3]);
    expect(snapshot.fallbackFrequency['gemini-3.6-flash']).toBe(1);
    expect(snapshot.failureClassifications.API_RATE_LIMIT_RPM_429).toBe(1);
    expect(snapshot.preferenceOrder).toEqual(settings.preferredModelOrder);
    expect(snapshot.fallbackRules.failoverErrorCodes).toContain('API_RATE_LIMIT_RPM_429');
  });

  it('builds a prompt that keeps observed, inferred, external evidence and recommendations distinct', () => {
    const range = { period: 'last-7-days' as const, start: 1, end: 2, timezone: 'Africa/Johannesburg' };
    const snapshot = buildDiagnosticsSnapshot(range, settings, []);
    const prompt = createDiagnosticsAnalysisPrompt(snapshot, [{
      source: 'Google Cloud Service Health',
      title: 'Google Cloud Service Health',
      checkedAt: 123,
      summary: 'No broad severe incidents.',
      url: 'https://status.cloud.google.com/summary',
    }]);
    expect(prompt).toContain('OBSERVED');
    expect(prompt).toContain('INFERRED');
    expect(prompt).toContain('EXTERNAL EVIDENCE');
    expect(prompt).toContain('RECOMMENDATION');
    expect(prompt).toContain('must not claim causation from correlation');
    expect(prompt).toContain('must not claim that any change has been applied');
  });

  it('never puts raw diagnostic message text into the analysis prompt payload', () => {
    const range = { period: 'last-hour' as const, start: 0, end: Date.now(), timezone: 'UTC' };
    const secretEvent = event({ message: 'apiKey=SUPERSECRET', kind: 'ERROR', outcome: 'failure', errorCode: 'UNKNOWN_API_ERROR' });
    const snapshot = buildDiagnosticsSnapshot(range, settings, [secretEvent]);
    const prompt = createDiagnosticsAnalysisPrompt(snapshot);
    expect(prompt).not.toContain('SUPERSECRET');
    expect(prompt).toContain('[bounded diagnostic message omitted]');
  });
});
