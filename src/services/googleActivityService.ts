import type { GoogleActivityEvent, GoogleActivityRecorder } from '../contracts/googleActivity';

const MAX_EVENTS = 200;
const STORAGE_KEY = 'elara_google_activity_v1';

function loadPersisted(): GoogleActivityEvent[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_EVENTS) : [];
  } catch {
    return [];
  }
}

function persist(events: readonly GoogleActivityEvent[]): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS))); } catch { /* best-effort */ }
}

export function createGoogleActivityRecorder(): GoogleActivityRecorder {
  const events: GoogleActivityEvent[] = loadPersisted();
  return {
    record(event) {
      events.unshift({ ...event });
      if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
      persist(events);
    },
    list(limit = 50) {
      return events.slice(0, Math.max(0, limit)).map(event => ({ ...event }));
    },
    clear() {
      events.length = 0;
      persist(events);
    },
  };
}

export const googleActivityRecorder = createGoogleActivityRecorder();
