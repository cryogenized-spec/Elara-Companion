import type { ClassifiedApiError } from './apiError';

export type ResilienceDiagnosticLevel = 'off' | 'basic' | 'detailed' | 'debug';
export type ResilienceDiagnosticEventKind = 'REQUEST' | 'RETRY' | 'ERROR' | 'POLICY' | 'ROUTE' | 'COOLDOWN' | 'RECOVERY' | 'SUCCESS';

export interface ResilienceDiagnosticEvent {
  id: number;
  timestamp: number;
  kind: ResilienceDiagnosticEventKind;
  preferredModel?: string;
  actualModel?: string;
  preferenceRank?: number;
  attempt?: number;
  errorCode?: ClassifiedApiError['code'];
  httpStatus?: number;
  retryDelayMs?: number;
  retrying?: boolean;
  fallbackAllowed?: boolean;
  fallbackTarget?: string;
  cooldownUntil?: number;
  message?: string;
}

const listeners = new Set<(event: ResilienceDiagnosticEvent) => void>();
const MAX_EVENTS = 200;
let eventId = 0;
let history: ResilienceDiagnosticEvent[] = [];

function safeModel(model?: string): string | undefined {
  if (!model) return undefined;
  return model.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 120);
}

function safeMessage(message?: string): string | undefined {
  if (!message) return undefined;
  return message
    .replace(/[\r\n\t]/g, ' ')
    .replace(/authorization\s*:\s*bearer\s+[^\s,;]+/gi, 'authorization: [redacted]')
    .replace(/(api[_ -]?key|access[_ -]?token|oauth[_ -]?token|cookie|secret)\s*[=:]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/"(?:apiKey|accessToken|refreshToken|clientSecret|authorization|cookie)"\s*:\s*"[^"]*"/gi, '"$1":"[redacted]"')
    .slice(0, 240);
}

export function sanitizeResilienceDiagnosticEvent(
  event: Omit<ResilienceDiagnosticEvent, 'id' | 'timestamp'>,
): ResilienceDiagnosticEvent {
  return {
    ...event,
    id: ++eventId,
    timestamp: Date.now(),
    preferredModel: safeModel(event.preferredModel),
    actualModel: safeModel(event.actualModel),
    fallbackTarget: safeModel(event.fallbackTarget),
    message: safeMessage(event.message),
  };
}

export function emitResilienceDiagnostic(event: Omit<ResilienceDiagnosticEvent, 'id' | 'timestamp'>): ResilienceDiagnosticEvent {
  const sanitized = sanitizeResilienceDiagnosticEvent(event);
  history = [...history.slice(-(MAX_EVENTS - 1)), sanitized];
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
}

export function formatResilienceDiagnosticTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.toLocaleTimeString([], { hour12: false })}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}
