import { get, set, del } from 'idb-keyval';
import type { GoogleCalendarEvent } from '../contracts';

const CALENDAR_SYNC_STORAGE_KEY = 'elara_google_calendar_sync_v1';

export interface CalendarSyncState {
  calendarId: string;
  syncToken: string;
  events: GoogleCalendarEvent[];
  syncedAt: number;
}

interface CalendarSyncStore {
  version: 1;
  calendars: Record<string, CalendarSyncState>;
}

const EMPTY_STORE: CalendarSyncStore = { version: 1, calendars: {} };
let memoryStore: CalendarSyncStore = EMPTY_STORE;

function normalizeEvent(value: unknown): GoogleCalendarEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Partial<GoogleCalendarEvent>;
  if (typeof event.id !== 'string' || typeof event.summary !== 'string') return null;
  if (!event.start || typeof event.start !== 'object' || !event.end || typeof event.end !== 'object') return null;
  return event as GoogleCalendarEvent;
}

function normalizeState(value: unknown): CalendarSyncStore {
  if (!value || typeof value !== 'object') return EMPTY_STORE;
  const parsed = value as Partial<CalendarSyncStore>;
  const calendars: Record<string, CalendarSyncState> = {};
  if (!parsed.calendars || typeof parsed.calendars !== 'object') return { version: 1, calendars };

  for (const [calendarId, candidate] of Object.entries(parsed.calendars as Record<string, unknown>)) {
    if (!candidate || typeof candidate !== 'object') continue;
    const state = candidate as Partial<CalendarSyncState>;
    if (typeof state.calendarId !== 'string' || typeof state.syncToken !== 'string' || typeof state.syncedAt !== 'number') continue;
    const events = Array.isArray(state.events)
      ? state.events.map(normalizeEvent).filter(Boolean) as GoogleCalendarEvent[]
      : [];
    calendars[calendarId] = {
      calendarId: state.calendarId,
      syncToken: state.syncToken,
      events,
      syncedAt: state.syncedAt,
    };
  }

  return { version: 1, calendars };
}

async function loadStore(): Promise<CalendarSyncStore> {
  try {
    return normalizeState(await get(CALENDAR_SYNC_STORAGE_KEY));
  } catch {
    return memoryStore;
  }
}

async function saveStore(store: CalendarSyncStore): Promise<void> {
  memoryStore = store;
  try {
    await set(CALENDAR_SYNC_STORAGE_KEY, store);
  } catch {
    // IndexedDB can be unavailable in server/test contexts; memory remains the safe session fallback.
  }
}

export async function getCalendarSyncState(calendarId = 'primary'): Promise<CalendarSyncState | null> {
  const id = String(calendarId || 'primary').trim() || 'primary';
  const store = await loadStore();
  return store.calendars[id] || null;
}

export async function setCalendarSyncState(state: CalendarSyncState): Promise<void> {
  const id = String(state.calendarId || 'primary').trim() || 'primary';
  const store = await loadStore();
  await saveStore({
    version: 1,
    calendars: {
      ...store.calendars,
      [id]: {
        ...state,
        calendarId: id,
        events: state.events.map((event) => ({ ...event })),
      },
    },
  });
}

export async function clearCalendarSyncState(calendarId = 'primary'): Promise<void> {
  const id = String(calendarId || 'primary').trim() || 'primary';
  const store = await loadStore();
  const calendars = { ...store.calendars };
  delete calendars[id];
  await saveStore({ version: 1, calendars });
}

export async function clearAllCalendarSyncState(): Promise<void> {
  memoryStore = EMPTY_STORE;
  try {
    await del(CALENDAR_SYNC_STORAGE_KEY);
  } catch {
    // Best effort; there is no durable state left in the in-memory fallback.
  }
}
