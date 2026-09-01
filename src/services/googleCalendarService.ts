import {
  CalendarEventItem,
  CalendarEventPatch,
  createCalendarEventWithToken,
  deleteCalendarEventWithToken,
  getCalendarEventWithToken,
  getCalendarEventsRangeWithToken,
  getUpcomingCalendarEventsWithToken,
  patchCalendarEventWithToken,
} from '../infrastructure/googleCalendarApi';

export type { CalendarEventItem, CalendarEventPatch } from '../infrastructure/googleCalendarApi';

export type CalendarTokenCapability = 'calendar.read' | 'calendar.write';
export type CalendarTokenProvider = (capability: CalendarTokenCapability) => Promise<string>;

let calendarTokenProvider: CalendarTokenProvider | null = null;

export function setCalendarTokenProvider(provider: CalendarTokenProvider | null): void {
  calendarTokenProvider = provider;
}

async function getCalendarToken(
  capability: CalendarTokenCapability,
  passedToken?: string,
): Promise<string> {
  if (passedToken?.trim()) return passedToken.trim();
  if (!calendarTokenProvider) {
    throw new Error('Google Calendar authorization provider is not configured.');
  }
  const token = await calendarTokenProvider(capability);
  if (!token?.trim()) throw new Error('Google Calendar authorization is required.');
  return token.trim();
}

export async function getUpcomingCalendarEvents(maxResults = 10, passedToken?: string): Promise<{ items: CalendarEventItem[] }> {
  return getUpcomingCalendarEventsWithToken(await getCalendarToken('calendar.read', passedToken), maxResults);
}

export async function getCalendarEventsRange(
  startTime: string,
  endTime: string,
  maxResults = 50,
  passedToken?: string,
): Promise<{ items: CalendarEventItem[]; startTime: string; endTime: string }> {
  return getCalendarEventsRangeWithToken(
    await getCalendarToken('calendar.read', passedToken),
    startTime,
    endTime,
    maxResults,
  );
}

export async function getCalendarEvent(
  eventId: string,
  passedToken?: string,
): Promise<CalendarEventItem> {
  return getCalendarEventWithToken(await getCalendarToken('calendar.read', passedToken), eventId);
}

export async function createCalendarEvent(
  summary: string,
  startTime: string,
  endTime: string,
  description?: string,
  location?: string,
  passedToken?: string,
): Promise<CalendarEventItem> {
  return createCalendarEventWithToken(
    await getCalendarToken('calendar.write', passedToken),
    summary,
    startTime,
    endTime,
    description,
    location,
  );
}

export async function patchCalendarEvent(
  eventId: string,
  patch: CalendarEventPatch,
  passedToken?: string,
): Promise<CalendarEventItem> {
  return patchCalendarEventWithToken(
    await getCalendarToken('calendar.write', passedToken),
    eventId,
    patch,
  );
}

export async function deleteCalendarEvent(
  eventId: string,
  passedToken?: string,
): Promise<void> {
  return deleteCalendarEventWithToken(await getCalendarToken('calendar.write', passedToken), eventId);
}
