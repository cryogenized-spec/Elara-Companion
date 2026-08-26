import { googleIdentity, googleCapabilities } from './googleWorkspaceService';
import {
  CalendarEventItem,
  createCalendarEventWithToken,
  getCalendarEventsRangeWithToken,
  getUpcomingCalendarEventsWithToken,
} from '../infrastructure/googleCalendarApi';

export type { CalendarEventItem } from '../infrastructure/googleCalendarApi';

async function getCalendarToken(
  capability: 'calendar.read' | 'calendar.write',
  passedToken?: string,
): Promise<string> {
  if (passedToken?.trim()) return passedToken.trim();
  const grantedScopes = googleCapabilities.getGrantedScopes();
  if (!googleIdentity.isAuthorized() || !googleCapabilities.isGranted(grantedScopes, capability)) {
    const scopes = googleCapabilities.getScopes(capability);
    const result = await googleIdentity.requestCapabilityAuthorization(scopes, false);
    if (!result) throw new Error('Google Calendar authorization was not granted.');
  }
  const token = googleIdentity.getAccessToken();
  if (!token) throw new Error('Google Calendar authorization is required.');
  return token;
}

/** Canonical Calendar application service. It owns authorization policy and delegates REST mechanics to shared infrastructure. */
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
