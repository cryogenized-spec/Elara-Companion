import { googleIdentity, googleCapabilities } from './googleWorkspaceService';

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
  status?: string;
}

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

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders(token: string) {
  return { ...authHeaders(token), 'Content-Type': 'application/json' };
}

async function parseGoogleApiError(res: Response, prefix: string): Promise<string> {
  const raw = await res.text().catch(() => '');
  try {
    const json = JSON.parse(raw);
    return `${prefix}: ${json?.error?.message || json?.error || `HTTP ${res.status}`}`;
  } catch {
    return `${prefix}: ${raw || `HTTP ${res.status}`}`;
  }
}

function normalizeEvent(event: any): CalendarEventItem {
  return {
    id: event.id,
    summary: event.summary || '(Untitled Event)',
    description: event.description,
    start: event.start || {},
    end: event.end || {},
    location: event.location,
    htmlLink: event.htmlLink,
    status: event.status,
  };
}

/** Canonical Calendar read adapter. UI code should not know the Google REST URL. */
export async function getUpcomingCalendarEvents(maxResults = 10, passedToken?: string): Promise<{ items: CalendarEventItem[] }> {
  const token = await getCalendarToken('calendar.read', passedToken);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(new Date().toISOString())}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch calendar events'));
  const data = await res.json();
  return { items: (data.items || []).map(normalizeEvent) };
}

export async function getCalendarEventsRange(
  startTime: string,
  endTime: string,
  maxResults = 50,
  passedToken?: string,
): Promise<{ items: CalendarEventItem[]; startTime: string; endTime: string }> {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Valid startTime and endTime are required.');
  }
  if (end <= start) throw new Error('endTime must be after startTime.');
  const token = await getCalendarToken('calendar.read', passedToken);
  const timeMin = start.toISOString();
  const timeMax = end.toISOString();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch calendar events'));
  const data = await res.json();
  return { startTime: timeMin, endTime: timeMax, items: (data.items || []).map(normalizeEvent) };
}

export async function createCalendarEvent(
  summary: string,
  startTime: string,
  endTime: string,
  description?: string,
  location?: string,
  passedToken?: string,
): Promise<CalendarEventItem> {
  const token = await getCalendarToken('calendar.write', passedToken);
  const body: Record<string, unknown> = {
    summary,
    start: { dateTime: startTime },
    end: { dateTime: endTime },
  };
  if (description) body.description = description;
  if (location) body.location = location;

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to create calendar event'));
  return normalizeEvent(await res.json());
}
