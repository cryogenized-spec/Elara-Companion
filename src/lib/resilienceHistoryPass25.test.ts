import { describe, expect, it } from 'vitest';
import { runWithModelResilience, type ModelResilienceStateStore } from './modelResilience';
import { createModelHealthState } from './modelHealth';
import {
  clearResilienceDiagnosticHistory,
  emitResilienceDiagnostic,
  getResilienceDiagnosticHistory,
  getResilienceSessionId,
  setResilienceDiagnosticStorage,
} from './resilienceDiagnostics';
import { deriveModelHealthHistory } from './resilienceModelHealth';

function makeStorage(initial = []) {
  let state = [...initial];
  return {
    read: () => [...state],
    write: (events: typeof state) => { state = [...events]; },
    clear: () => { state = []; },
    snapshot: () => [...state],
  };
}

function makeHealthStore(): ModelResilienceStateStore {
  let state = createModelHealthState();
  return {
    get: () => state,
    set: (next) => { state = next; },
  };
}

describe('Pass 25 durable routing history', () => {
  it('persists structured events and reconstructs them after storage replacement', () => {
    const storage = makeStorage();
    setResilienceDiagnosticStorage(storage);
    clearResilienceDiagnosticHistory();

    const created = emitResilienceDiagnostic({
      kind: 'ROUTE',
      outcome: 'fallback',
      provider: 'google',
      conversationId: 'conversation-123',
      requestId: 'request-456',
      preferredModel: 'gemini-3.7-flash',
      actualModel: 'gemini-3.7-flash',
      preferenceRank: 1,
      attempt: 2,
      errorCode: 'API_RATE_LIMIT_RPM_429',
      httpStatus: 429,
      retryAfterMs: 4000,
      fallbackEligible: true,
      fallbackAllowed: true,
      fallbackTaken: true,
      fallbackTarget: 'gemini-3.6-flash',
      cooldownApplied: true,
      latencyMs: 127,
    });

    expect(created.timestamp).toBeTypeOf('number');
    expect(created.timezone).toBeTruthy();
    expect(created.sessionId).toBe(getResilienceSessionId());
    expect(storage.snapshot()).toEqual([created]);

    const restoredStorage = makeStorage(storage.snapshot());
    setResilienceDiagnosticStorage(restoredStorage);
    expect(getResilienceDiagnosticHistory()).toEqual([created]);
  });

  it('keeps a real fallback request trace tied to one request id', async () => {
    const storage = makeStorage();
    setResilienceDiagnosticStorage(storage);
    clearResilienceDiagnosticHistory();

    let calls = 0;
    await runWithModelResilience(
      'gemini-3.7-flash',
      async (model) => {
        calls += 1;
        if (model === 'gemini-3.7-flash') {
          const error = new Error('429 rate limit');
          (error as any).apiError = {
            code: 'API_RATE_LIMIT_RPM_429',
            httpStatus: 429,
            modelId: model,
            message: 'rate limited',
            retryable: false,
            retryAfterMs: 3000,
            rawMessage: '429 rate limit',
          };
          throw error;
        }
        return { value: 'ok' };
      },
      {
        preferenceOrder: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'],
        retryPolicy: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0, jitterRatio: 0, honorRetryAfter: false },
        failoverEnabled: true,
        failoverErrorCodes: ['API_RATE_LIMIT_RPM_429'],
        cooldownMs: 60_000,
      },
      makeHealthStore(),
    );

    const history = getResilienceDiagnosticHistory();
    const requestIds = new Set(history.map((event) => event.requestId));
    expect(calls).toBe(2);
    expect(requestIds.size).toBe(1);
    expect(history.some((event) => event.kind === 'REQUEST' && event.actualModel === 'gemini-3.7-flash' && event.preferenceRank === 1)).toBe(true);
    expect(history.some((event) => event.kind === 'ERROR' && event.httpStatus === 429 && event.retryAfterMs === 3000)).toBe(true);
    expect(history.some((event) => event.kind === 'ROUTE' && event.fallbackTaken && event.fallbackTarget === 'gemini-3.6-flash')).toBe(true);
    expect(history.some((event) => event.kind === 'SUCCESS' && event.actualModel === 'gemini-3.6-flash' && typeof event.latencyMs === 'number')).toBe(true);
  });

  it('uses an allow-list so secret-shaped unknown properties are not persisted', () => {
    const storage = makeStorage();
    setResilienceDiagnosticStorage(storage);
    clearResilienceDiagnosticHistory();

    const event = emitResilienceDiagnostic({
      kind: 'ERROR',
      provider: 'google',
      message: 'apiKey=secret-token authorization: Bearer very-secret-value',
      preferredModel: 'gemini-3.7-flash',
      actualModel: 'gemini-3.7-flash',
      ...( { accessToken: 'SHOULD_NOT_EXIST', apiKey: 'SHOULD_NOT_EXIST' } as Record<string, unknown> ),
    } as never);

    const persisted = JSON.stringify(storage.snapshot());
    expect(persisted).not.toContain('SHOULD_NOT_EXIST');
    expect(event.message).toContain('[redacted]');
    expect(event).not.toHaveProperty('accessToken');
    expect(event).not.toHaveProperty('apiKey');
  });

  it('bounds retention', () => {
    const storage = makeStorage();
    setResilienceDiagnosticStorage(storage);
    clearResilienceDiagnosticHistory();
    for (let i = 0; i < 550; i += 1) {
      emitResilienceDiagnostic({ kind: 'SUCCESS', outcome: 'success', provider: 'google', actualModel: `model-${i}`, message: `ok-${i}` });
    }
    expect(getResilienceDiagnosticHistory()).toHaveLength(500);
    expect(getResilienceDiagnosticHistory()[0]?.actualModel).toBe('model-50');
  });

  it('derives healthy, cooling, degraded and unavailable states from the event history', () => {
    const now = Date.now();
    const events = [
      { id: 1, timestamp: now - 5000, timezone: 'Africa/Johannesburg', kind: 'SUCCESS' as const, provider: 'google', actualModel: 'healthy-model', message: 'ok' },
      { id: 2, timestamp: now - 4000, timezone: 'Africa/Johannesburg', kind: 'ERROR' as const, provider: 'google', actualModel: 'cool-model', errorCode: 'SERVER_ERROR_500' as const, cooldownUntil: now + 5000, cooldownApplied: true },
      { id: 3, timestamp: now - 3000, timezone: 'Africa/Johannesburg', kind: 'ERROR' as const, provider: 'google', actualModel: 'bad-model', errorCode: 'SERVER_ERROR_500' as const },
      { id: 4, timestamp: now - 2000, timezone: 'Africa/Johannesburg', kind: 'ERROR' as const, provider: 'google', actualModel: 'gone-model', errorCode: 'MODEL_NOT_FOUND_404' as const },
    ];
    const snapshots = deriveModelHealthHistory(events, now);
    expect(snapshots.find((item) => item.model === 'healthy-model')?.health).toBe('healthy');
    expect(snapshots.find((item) => item.model === 'cool-model')?.health).toBe('cooling down');
    expect(snapshots.find((item) => item.model === 'bad-model')?.health).toBe('degraded');
    expect(snapshots.find((item) => item.model === 'gone-model')?.health).toBe('unavailable');
  });
});
