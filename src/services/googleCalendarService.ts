import {
  CalendarEventItem,
  CalendarEventPatch,
  CalendarFreeBusyResponse,
  CalendarListItem,
  CalendarEventCreateOptions,
  CalendarSyncResponse,
  CalendarListSyncResponse,
  createCalendarEventWithToken,
  deleteCalendarEventWithToken,
  getCalendarEventWithToken,
  getCalendarEventInstancesWithToken,
  getCalendarEventsRangeWithToken,
  getCalendarFreeBusyWithToken,
  getCalendarListWithToken,
  getUpcomingCalendarEventsWithToken,
  patchCalendarEventWithToken,
  syncCalendarEventsWithToken,
  syncCalendarListWithToken,
} from '../infrastructure/googleCalendarApi';
import { stopCalendarWatchWithToken, watchCalendarEventsWithToken } from '../infrastructure/googleCalendarWatchApi';
import type { CalendarWatchChannel, CalendarWatchOptions } from '../infrastructure/googleCalendarWatchApi';

export type {
  CalendarEventDateTime,
  CalendarEventItem,
  CalendarEventPatch,
  CalendarEventCreateOptions,
  CalendarFreeBusyRange,
  CalendarFreeBusyCalendar,
  CalendarFreeBusyResponse,
  CalendarListItem,
  CalendarSyncResponse,
  CalendarListSyncResponse,
} from '../infrastructure/googleCalendarApi';
export { CalendarSyncTokenExpiredError } from '../infrastructure/googleCalendarApi';
export type { CalendarWatchChannel, CalendarWatchOptions } from '../infrastructure/googleCalendarWatchApi';

export type CalendarTokenCapability = 'calendar.read' | 'calendar.write' | 'calendar.list' | 'calendar.freebusy';
export type CalendarTokenProvider = (capability: CalendarTokenCapability) => Promise<string>;

let calendarTokenProvider: CalendarTokenProvider | null = null;

export function setCalendarTokenProvider(provider: CalendarTokenProvider | null): void { calendarTokenProvider = provider; }

async function getCalendarToken(capability: CalendarTokenCapability, passedToken?: string): Promise<string> {
  if (passedToken?.trim()) return passedToken.trim();
  if (!calendarTokenProvider) throw new Error('Google Calendar authorization provider is not configured.');
  const token = await calendarTokenProvider(capability);
  if (!token?.trim()) throw new Error('Google Calendar authorization is required.');
  return token.trim();
}

export async function getUpcomingCalendarEvents(maxResults = 10, passedToken?: string, calendarId = 'primary'): Promise<{ items: CalendarEventItem[] }> {
  return getUpcomingCalendarEventsWithToken(await getCalendarToken('calendar.read', passedToken), maxResults, calendarId);
}

export async function getCalendarEventsRange(startTime: string, endTime: string, maxResults = 50, passedToken?: string, calendarId = 'primary'): Promise<{ items: CalendarEventItem[]; startTime: string; endTime: string }> {
  return getCalendarEventsRangeWithToken(await getCalendarToken('calendar.read', passedToken), startTime, endTime, maxResults, calendarId);
}

export async function getCalendarEvent(eventId: string, passedToken?: string, calendarId = 'primary'): Promise<CalendarEventItem> {
  return getCalendarEventWithToken(await getCalendarToken('calendar.read', passedToken), eventId, calendarId);
}

export async function getCalendarList(maxResults = 50, passedToken?: string): Promise<{ items: CalendarListItem[] }> {
  return getCalendarListWithToken(await getCalendarToken('calendar.list', passedToken), maxResults);
}

export async function getCalendarFreeBusy(timeMin: string, timeMax: string, calendarIds: string[], passedToken?: string): Promise<CalendarFreeBusyResponse> {
  return getCalendarFreeBusyWithToken(await getCalendarToken('calendar.freebusy', passedToken), timeMin, timeMax, calendarIds);
}

export async function getCalendarEventInstances(recurringEventId: string, options: { timeMin?: string; timeMax?: string; maxResults?: number; calendarId?: string } = {}, passedToken?: string): Promise<{ items: CalendarEventItem[] }> {
  return getCalendarEventInstancesWithToken(await getCalendarToken('calendar.read', passedToken), recurringEventId, options);
}

export async function createCalendarEvent(summary: string, startTime: string, endTime: string, description?: string, location?: string, passedToken?: string, options?: CalendarEventCreateOptions): Promise<CalendarEventItem> {
  return createCalendarEventWithToken(await getCalendarToken('calendar.write', passedToken), summary, startTime, endTime, description, location, options);
}

export async function patchCalendarEvent(eventId: string, patch: CalendarEventPatch, passedToken?: string, calendarId = 'primary'): Promise<CalendarEventItem> {
  return patchCalendarEventWithToken(await getCalendarToken('calendar.write', passedToken), eventId, patch, calendarId);
}

export async function deleteCalendarEvent(eventId: string, passedToken?: string, calendarId = 'primary'): Promise<void> {
  return deleteCalendarEventWithToken(await getCalendarToken('calendar.write', passedToken), eventId, calendarId);
}

export async function syncCalendarEvents(calendarId = 'primary', syncToken?: string, passedToken?: string): Promise<CalendarSyncResponse> {
  return syncCalendarEventsWithToken(await getCalendarToken('calendar.read', passedToken), calendarId, syncToken);
}

export async function syncCalendarList(syncToken?: string, passedToken?: string): Promise<CalendarListSyncResponse> {
  return syncCalendarListWithToken(await getCalendarToken('calendar.list', passedToken), syncToken);
}

export async function watchCalendarEvents(calendarId = 'primary', options: CalendarWatchOptions, passedToken?: string): Promise<CalendarWatchChannel> {
  return watchCalendarEventsWithToken(await getCalendarToken('calendar.read', passedToken), calendarId, options);
}

export async function stopCalendarWatch(channelId: string, resourceId: string, passedToken?: string): Promise<void> {
  return stopCalendarWatchWithToken(await getCalendarToken('calendar.read', passedToken), channelId, resourceId);
}
