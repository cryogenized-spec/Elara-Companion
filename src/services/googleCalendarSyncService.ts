import { CalendarSyncTokenExpiredError } from '../infrastructure/googleCalendarApi';
import type { GoogleCalendarEvent, GoogleCalendarSyncResult, GoogleCalendarSyncState } from '../contracts';
import {
  getCalendarSyncState,
  setCalendarSyncState,
} from '../lib/calendarSyncStorage';
import { syncCalendarEvents } from './googleCalendarService';

const syncLocks = new Map<string, Promise<GoogleCalendarSyncResult>>();

function normalizeCalendarId(calendarId?: string): string {
  return String(calendarId || 'primary').trim() || 'primary';
}

function eventStartKey(event: GoogleCalendarEvent): string {
  return event.start.dateTime || event.start.date || '';
}

function sortEvents(events: GoogleCalendarEvent[]): GoogleCalendarEvent[] {
  return [...events].sort((left, right) => {
    const startCompare = eventStartKey(left).localeCompare(eventStartKey(right));
    return startCompare !== 0 ? startCompare : left.id.localeCompare(right.id);
  });
}

function applyChanges(
  existing: GoogleCalendarEvent[],
  changes: GoogleCalendarEvent[],
): { events: GoogleCalendarEvent[]; upserted: number; removed: number } {
  const byId = new Map(existing.map((event) => [event.id, event]));
  let upserted = 0;
  let removed = 0;

  for (const event of changes) {
    if (event.status === 'cancelled') {
      if (byId.delete(event.id)) removed += 1;
      continue;
    }
    byId.set(event.id, event);
    upserted += 1;
  }

  return { events: sortEvents([...byId.values()]), upserted, removed };
}

async function performCalendarSync(calendarId: string): Promise<GoogleCalendarSyncResult> {
  const existing = await getCalendarSyncState(calendarId);
  let mode: 'full' | 'incremental' = existing?.syncToken ? 'incremental' : 'full';
  let reset = false;

  let response;
  try {
    response = await syncCalendarEvents(calendarId, existing?.syncToken);
  } catch (error) {
    if (!(error instanceof CalendarSyncTokenExpiredError) || !existing?.syncToken) throw error;
    mode = 'full';
    reset = true;
    response = await syncCalendarEvents(calendarId);
  }

  const applied = applyChanges(mode === 'full' ? [] : existing?.events || [], response.items);
  const syncedAt = Date.now();
  const state: GoogleCalendarSyncState = {
    calendarId,
    syncToken: response.nextSyncToken,
    events: applied.events,
    syncedAt,
  };
  await setCalendarSyncState(state);

  return {
    calendarId,
    mode,
    upserted: applied.upserted,
    removed: applied.removed,
    total: applied.events.length,
    syncedAt,
    syncToken: response.nextSyncToken,
    reset,
  };
}

export async function syncGoogleCalendar(calendarId = 'primary'): Promise<GoogleCalendarSyncResult> {
  const id = normalizeCalendarId(calendarId);
  const active = syncLocks.get(id);
  if (active) return active;

  const promise = performCalendarSync(id).finally(() => {
    if (syncLocks.get(id) === promise) syncLocks.delete(id);
  });
  syncLocks.set(id, promise);
  return promise;
}

export async function getLocalGoogleCalendarSyncState(calendarId = 'primary'): Promise<GoogleCalendarSyncState | null> {
  return getCalendarSyncState(normalizeCalendarId(calendarId));
}
