import type { ClassifiedApiError } from './apiError';

export type ResilienceDiagnosticLevel = 'off' | 'basic' | 'detailed' | 'debug';
export type ResilienceDiagnosticEventKind = 'REQUEST' | 'RETRY' | 'ERROR' | 'POLICY' | 'ROUTE' | 'COOLDOWN' | 'RECOVERY' | 'SUCCESS';
export type ResilienceDiagnosticOutcome = 'success' | 'failure' | 'retry' | 'fallback' | 'cooldown' | 'recovery';

export interface ResilienceDiagnosticEvent {
  id: number;
  timestamp: number;
  timezone: string;
  kind: ResilienceDiagnosticEventKind;
  outcome?: ResilienceDiagnosticOutcome;
  provider: string;
  sessionId?: string;
  conversationId?: string;
  requestId?: string;
  preferredModel?: string;
  actualModel?: string;
  preferenceRank?: number;
  attempt?: number;
  errorCode?: ClassifiedApiError['code'];
  httpStatus?: number;
  retryAfterMs?: number;
  retryDelayMs?: number;
  retrying?: boolean;
  fallbackEligible?: boolean;
  fallbackAllowed?: boolean;
  fallbackTaken?: boolean;
  fallbackTarget?: string;
  cooldownApplied?: boolean;
  cooldownUntil?: number;
  latencyMs?: number;
  message?: string;
}

export interface ResilienceDiagnosticStorage {
  read(): ResilienceDiagnosticEvent[];
  write(events: ResilienceDiagnosticEvent[]): void;
  clear(): void;
}

const STORAGE_KEY = 'elara.resilience.routing-history.v1';
const MAX_EVENTS = 500;
const DEFAULT_TIMEZONE = 'UTC';

const listeners = new Set<(event: ResilienceDiagnosticEvent) => void>();
let eventId = 0;
let sessionId = createSessionId();

function createSessionId(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `session-${random}`;
}

function defaultStorage(): ResilienceDiagnosticStorage {
  return {
    read() {
      if (typeof window === 'undefined') return [];
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isDiagnosticEvent).slice(-MAX_EVENTS);
      } catch {
        return [];
      }
    },
    write(events) {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
      } catch {
        // Persistence is best-effort; routing must never fail because storage is unavailable.
      }
    },
    clear() {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore unavailable browser storage.
      }
    },
  };
}

let storage: ResilienceDiagnosticStorage = defaultStorage();
let history: ResilienceDiagnosticEvent[] = storage.read();

function isDiagnosticEvent(value: unknown): value is ResilienceDiagnosticEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<ResilienceDiagnosticEvent>;
  return typeof event.id === 'number'
    && typeof event.timestamp === 'number'
    && typeof event.timezone === 'string'
    && typeof event.kind === 'string'
    && typeof event.provider === 'string';
}

function currentTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function safeModel(model?: string): string | undefined {
  if (!model) return undefined;
  return model.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 120);
}

function safeId(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 160);
}

function safeMessage(message?: string): string | undefined {
  if (!message) return undefined;
  return message
    .replace(/[\r\n\t]/g, ' ')
    .replace(/authorization\s*:\s*bearer\s+[^\s,;]+/gi, 'authorization: [redacted]')
    .replace(/(api[_ -]?key|access[_ -]?token|oauth[_ -]?token|cookie|secret|password)\s*[=:]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/"(?:apiKey|accessToken|refreshToken|clientSecret|authorization|cookie|password)"\s*:\s*"[^"]*"/gi, '"$1":"[redacted]"')
    .slice(0, 240);
}

export function setResilienceDiagnosticStorage(nextStorage: ResilienceDiagnosticStorage): void {
  storage = nextStorage;
  history = storage.read().filter(isDiagnosticEvent).slice(-MAX_EVENTS);
  eventId = history.reduce((max, event) => Math.max(max, event.id), 0);
}

export function getResilienceSessionId(): string {
  return sessionId;
}

export function resetResilienceSession(): void {
  sessionId = createSessionId();
}

export function sanitizeResilienceDiagnosticEvent(
  event: Omit<ResilienceDiagnosticEvent, 'id' | 'timestamp' | 'timezone' | 'sessionId'> & Partial<Pick<ResilienceDiagnosticEvent, 'sessionId'>>,
): ResilienceDiagnosticEvent {
  const sanitized: ResilienceDiagnosticEvent = {
    id: ++eventId,
    timestamp: Date.now(),
    timezone: currentTimezone(),
    kind: event.kind,
    outcome: event.outcome,
    provider: safeId(event.provider) || 'google',
    sessionId: safeId(event.sessionId) || sessionId,
    conversationId: safeId(event.conversationId),
    requestId: safeId(event.requestId),
    preferredModel: safeModel(event.preferredModel),
    actualModel: safeModel(event.actualModel),
    preferenceRank: event.preferenceRank,
    attempt: event.attempt,
    errorCode: event.errorCode,
    httpStatus: event.httpStatus,
    retryAfterMs: event.retryAfterMs,
    retryDelayMs: event.retryDelayMs,
    retrying: event.retrying,
    fallbackEligible: event.fallbackEligible,
    fallbackAllowed: event.fallbackAllowed,
    fallbackTaken: event.fallbackTaken,
    fallbackTarget: safeModel(event.fallbackTarget),
    cooldownApplied: event.cooldownApplied,
    cooldownUntil: event.cooldownUntil,
    latencyMs: event.latencyMs,
    message: safeMessage(event.message),
  };
  return sanitized;
}

export function emitResilienceDiagnostic(
  event: Omit<ResilienceDiagnosticEvent, 'id' | 'timestamp' | 'timezone' | 'sessionId'> & Partial<Pick<ResilienceDiagnosticEvent, 'sessionId'>>,
): ResilienceDiagnosticEvent {
  const sanitized = sanitizeResilienceDiagnosticEvent(event);
  history = [...history, sanitized].slice(-MAX_EVENTS);
  storage.write(history);
  listeners.forEach((listener) => listener(sanitized));
  return sanitized;
}

export function subscribeResilienceDiagnostics(listener: (event: ResilienceDiagnosticEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getResilienceDiagnosticHistory(): ResilienceDiagnosticEvent[] {
  return [...history];
}

export function clearResilienceDiagnosticHistory(): void {
  history = [];
  storage.clear();
}

export function formatResilienceDiagnosticTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.toLocaleTimeString([], { hour12: false })}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}
