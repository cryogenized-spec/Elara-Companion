import assert from 'node:assert/strict';
import test from 'node:test';
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

test('Pass 26 resolves diagnostics periods with machine-readable timestamps', () => {
  const now = Date.UTC(2026, 7, 28, 16, 0);
  assert.deepEqual(resolveDiagnosticsRange('last-hour', undefined, undefined, now), { period: 'last-hour', start: now - 3600000, end: now, timezone: 'UTC' });
  const today = resolveDiagnosticsRange('today', undefined, undefined, now);
  assert.ok(today.start < today.end);
  assert.equal(typeof today.timezone, 'string');
});

test('Pass 26 filters the local event history and captures fallback policy', () => {
  const inside = event({ id: 2, timestamp: Date.UTC(2026, 7, 28, 15, 30), kind: 'ERROR', outcome: 'failure', errorCode: 'API_RATE_LIMIT_RPM_429', httpStatus: 429, fallbackEligible: true, fallbackAllowed: true, fallbackTaken: true, fallbackTarget: 'gemini-3.6-flash' });
  const outside = event({ id: 3, timestamp: Date.UTC(2026, 6, 27, 15, 30) });
  const range = { period: 'last-30-days' as const, start: Date.UTC(2026, 7, 1), end: Date.UTC(2026, 7, 28, 23, 59), timezone: 'Africa/Johannesburg' };
  const snapshot = buildDiagnosticsSnapshot(range, settings, [inside, outside]);
  assert.deepEqual(snapshot.events.map((item) => item.id), [2]);
  assert.equal(snapshot.fallbackFrequency['gemini-3.6-flash'], 1);
  assert.equal(snapshot.failureClassifications.API_RATE_LIMIT_RPM_429, 1);
  assert.deepEqual(snapshot.preferenceOrder, settings.preferredModelOrder);
  assert.deepEqual(snapshot.fallbackRules.failoverErrorCodes, ['API_RATE_LIMIT_RPM_429']);
});

test('Pass 26 keeps local evidence, inference and external evidence distinct', () => {
  const range = { period: 'last-7-days' as const, start: 1, end: 2, timezone: 'Africa/Johannesburg' };
  const snapshot = buildDiagnosticsSnapshot(range, settings, []);
  const prompt = createDiagnosticsAnalysisPrompt(snapshot, [{
    source: 'Google Cloud Service Health',
    title: 'Google Cloud Service Health',
    checkedAt: 123,
    summary: 'No broad severe incidents.',
    url: 'https://status.cloud.google.com/summary',
  }]);
  assert.match(prompt, /OBSERVED/);
  assert.match(prompt, /INFERRED/);
  assert.match(prompt, /EXTERNAL EVIDENCE/);
  assert.match(prompt, /RECOMMENDATION/);
  assert.match(prompt, /do not claim causation from correlation/);
  assert.match(prompt, /MUST NOT claim that any change has been applied/);
});

test('Pass 26 removes raw diagnostic message text from the analysis prompt payload', () => {
  const range = { period: 'last-hour' as const, start: 0, end: Date.now(), timezone: 'UTC' };
  const secretEvent = event({ message: 'apiKey=SUPERSECRET', kind: 'ERROR', outcome: 'failure', errorCode: 'UNKNOWN_API_ERROR' });
  const snapshot = buildDiagnosticsSnapshot(range, settings, [secretEvent]);
  const prompt = createDiagnosticsAnalysisPrompt(snapshot);
  assert.ok(!prompt.includes('SUPERSECRET'));
  assert.match(prompt, /bounded diagnostic message omitted/);
});
