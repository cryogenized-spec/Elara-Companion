import type { GoogleActivityActionClass, GoogleActivityEvent, GoogleActivityRecorder, GoogleActivityResourceReference } from '../contracts/googleActivity';

const MAX_EVENTS = 200;
const STORAGE_KEY = 'elara_google_activity_v1';
const SECRET_KEY_PATTERN = /(access[_-]?token|refresh[_-]?token|authorization|client[_-]?secret|api[_-]?key|password|bearer|credential|oauth[_-]?token)/i;
const SENSITIVE_QUERY_KEYS = new Set(['access_token', 'refresh_token', 'token', 'id_token', 'client_secret', 'api_key', 'key', 'authorization']);
const SECRET_VALUE_PATTERN = /\b(?:ya29\.|AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,})\b/g;

function sanitizeText(value: unknown): string {
  return String(value ?? '')
    .replace(new RegExp(`\\b${SECRET_KEY_PATTERN.source}\\s*[:=]\\s*[^,;\\s]+`, 'gi'), '[redacted]')
    .replace(SECRET_VALUE_PATTERN, '[redacted]');
}

export function sanitizeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value);
    SENSITIVE_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));
    url.hash = '';
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

export function sanitizeResource(resource?: GoogleActivityResourceReference): GoogleActivityResourceReference | undefined {
  if (!resource || typeof resource !== 'object') return undefined;
  const type = sanitizeText(resource.type).trim();
  const id = sanitizeText(resource.id).trim();
  if (!type || !id || SECRET_KEY_PATTERN.test(type) || SECRET_KEY_PATTERN.test(id)) return undefined;
  const url = sanitizeUrl(resource.url);
  return url ? { type, id, url } : { type, id };
}

export function sanitizeActivityEvent(event: GoogleActivityEvent): GoogleActivityEvent {
  const resource = sanitizeResource(event.resource);
  return {
    id: sanitizeText(event.id).trim(),
    timestamp: Number.isFinite(event.timestamp) ? event.timestamp : Date.now(),
    capabilityId: sanitizeText(event.capabilityId).trim(),
    action: event.action,
    description: sanitizeText(event.description).trim() || 'Google operation',
    reversible: Boolean(event.reversible),
    external: Boolean(event.external),
    consequential: Boolean(event.consequential),
    ...(resource ? { resource } : {}),
  };
}

function loadPersisted(): GoogleActivityEvent[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((event) => event && typeof event === 'object').map((event) => sanitizeActivityEvent(event as GoogleActivityEvent)).slice(0, MAX_EVENTS) : [];
  } catch {
    return [];
  }
}

function persist(events: readonly GoogleActivityEvent[]): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS).map(sanitizeActivityEvent))); } catch { /* best-effort persistence */ }
}

export function createGoogleActivityRecorder(initialStorage?: Storage | null): GoogleActivityRecorder {
  const storage = initialStorage === undefined ? (typeof localStorage === 'undefined' ? null : localStorage) : initialStorage;
  const load = (): GoogleActivityEvent[] => {
    if (!storage) return [];
    try {
      const raw = storage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((event) => event && typeof event === 'object').map((event) => sanitizeActivityEvent(event as GoogleActivityEvent)).slice(0, MAX_EVENTS) : [];
    } catch { return []; }
  };
  const save = (events: readonly GoogleActivityEvent[]): void => {
    if (!storage) return;
    try { storage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS).map(sanitizeActivityEvent))); } catch { /* best-effort persistence */ }
  };
  const events: GoogleActivityEvent[] = storage ? load() : loadPersisted();
  return {
    record(event) {
      events.unshift(sanitizeActivityEvent(event));
      if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
      save(events);
    },
    list(limit = 50) {
      return events.slice(0, Math.max(0, limit)).map(event => ({ ...event, ...(event.resource ? { resource: { ...event.resource } } : {}) }));
    },
    clear() {
      events.length = 0;
      save(events);
    },
  };
}

export function inferActivityAction(description: string, fallback: GoogleActivityActionClass = 'read'): GoogleActivityActionClass {
  const text = description.trim().toLowerCase();
  if (/\b(sent|send)\b/.test(text)) return 'send';
  if (/\b(deleted|delete|removed|remove)\b/.test(text)) return 'delete';
  if (/\b(updated|update|edited|edit|changed|wrote|appended|modified)\b/.test(text)) return 'update';
  if (/\b(created|create|saved|uploaded|upload|completed|complete)\b/.test(text)) return 'create';
  if (/\b(opened|open|inspected|inspect)\b/.test(text)) return 'open';
  if (/\b(read|searched|search|found|listed|list|loaded|refreshed)\b/.test(text)) return 'read';
  return fallback;
}

export const googleActivityRecorder = createGoogleActivityRecorder();
