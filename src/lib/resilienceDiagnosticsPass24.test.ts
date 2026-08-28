import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyApiError } from './apiError';
import {
  clearResilienceDiagnosticHistory,
  emitResilienceDiagnostic,
  getResilienceDiagnosticHistory,
  sanitizeResilienceDiagnosticEvent,
} from './resilienceDiagnostics';
import { DEFAULT_RELIABILITY_SETTINGS, normalizeReliabilitySettings } from './reliabilitySettings';

const SENSITIVE = 'Authorization: Bearer super-secret-token';

test('Pass 24 diagnostic events are structured, bounded, and secret-free', () => {
  const sanitized = sanitizeResilienceDiagnosticEvent({
    kind: 'ERROR',
    preferredModel: 'gemini-3.7-flash',
    actualModel: 'gemini-3.6-flash',
    errorCode: 'API_RATE_LIMIT_RPM_429',
    httpStatus: 429,
    message: `failure\n${SENSITIVE}`,
  });

  assert.equal(sanitized.preferredModel, 'gemini-3.7-flash');
  assert.equal(sanitized.httpStatus, 429);
  assert.ok(!sanitized.message?.includes('Authorization:'));
  assert.ok(!sanitized.message?.includes('super-secret-token'));
});

test('Pass 24 diagnostics share one canonical event history', () => {
  clearResilienceDiagnosticHistory();
  emitResilienceDiagnostic({ kind: 'REQUEST', preferredModel: 'gemini-3.7-flash', actualModel: 'gemini-3.7-flash', attempt: 1 });
  emitResilienceDiagnostic({ kind: 'ERROR', preferredModel: 'gemini-3.7-flash', actualModel: 'gemini-3.7-flash', errorCode: 'API_RATE_LIMIT_RPM_429', httpStatus: 429, fallbackAllowed: true });
  emitResilienceDiagnostic({ kind: 'ROUTE', preferredModel: 'gemini-3.7-flash', actualModel: 'gemini-3.7-flash', fallbackTarget: 'gemini-3.6-flash', fallbackAllowed: true });

  assert.deepEqual(getResilienceDiagnosticHistory().map((event) => event.kind), ['REQUEST', 'ERROR', 'ROUTE']);
});

test('Pass 24 diagnostics default to OFF and preserve explicit user choices', () => {
  assert.equal(DEFAULT_RELIABILITY_SETTINGS.diagnosticLevel, 'off');
  assert.equal(normalizeReliabilitySettings({ diagnosticLevel: 'basic' }).diagnosticLevel, 'basic');
  assert.equal(normalizeReliabilitySettings({ diagnosticLevel: 'detailed' }).diagnosticLevel, 'detailed');
  assert.equal(normalizeReliabilitySettings({ diagnosticLevel: 'debug' }).diagnosticLevel, 'debug');
  assert.equal(normalizeReliabilitySettings({ diagnosticLevel: 'invalid' as any }).diagnosticLevel, 'off');
});

test('Pass 24 diagnostic failure classes come from the canonical API classifier', () => {
  const error = classifyApiError(Object.assign(new Error('HTTP 429'), { status: 429 }), 'gemini-3.7-flash');
  emitResilienceDiagnostic({
    kind: 'ERROR',
    preferredModel: 'gemini-3.7-flash',
    actualModel: 'gemini-3.7-flash',
    errorCode: error.code,
    httpStatus: error.httpStatus,
  });
  const [event] = getResilienceDiagnosticHistory().slice(-1);
  assert.equal(event.errorCode, 'API_RATE_LIMIT_RPM_429');
  assert.equal(event.httpStatus, 429);
});
