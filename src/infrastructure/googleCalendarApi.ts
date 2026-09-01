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

export interface CalendarEventPatch {
  summary?: string;
  description?: string | null;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  location?: string | null;
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

function positiveLimit(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.floor(value), 2500));
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

async function listCalendarEvents(
  token: string,
  initialParams: URLSearchParams,
  maxResults: number,
): Promise<CalendarEventItem[]> {
  const target = positiveLimit(maxResults, 50);
  const items: CalendarEventItem[] = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams(initialParams);
    params.set('maxResults', String(Math.min(target, 2500)));
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: authHeaders(token) },
    );
    if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch calendar events'));

    const data: any = await res.json();
    const page = (data.items || []).map(normalizeEvent);
    for (const event of page) {
      if (items.length >= target) break;
      items.push(event);
    }

    if (items.length >= target) break;
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return items;
}

export async function getUpcomingCalendarEventsWithToken(
  token: string,
  maxResults = 10,
): Promise<{ items: CalendarEventItem[] }> {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  return { items: await listCalendarEvents(token, params, maxResults) };
}

export async function getCalendarEventsRangeWithToken(
  token: string,
  startTime: string,
  endTime: string,
  maxResults = 50,
): Promise<{ items: CalendarEventItem[]; startTime: string; endTime: string }> {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Valid startTime and endTime are required.');
  }
  if (end <= start) throw new Error('endTime must be after startTime.');
  const timeMin = start.toISOString();
  const timeMax = end.toISOString();
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  return {
    startTime: timeMin,
    endTime: timeMax,
    items: await listCalendarEvents(token, params, maxResults),
  };
}

export async function getCalendarEventWithToken(
  token: string,
  eventId: string,
): Promise<CalendarEventItem> {
  const id = String(eventId || '').trim();
  if (!id) throw new Error('eventId is required.');
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch calendar event'));
  return normalizeEvent(await res.json());
}

export async function createCalendarEventWithToken(
  token: string,
  summary: string,
  startTime: string,
  endTime: string,
  description?: string,
  location?: string,
): Promise<CalendarEventItem> {
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

export async function patchCalendarEventWithToken(
  token: string,
  eventId: string,
  patch: CalendarEventPatch,
): Promise<CalendarEventItem> {
  const id = String(eventId || '').trim();
  if (!id) throw new Error('eventId is required.');
  if (!patch || typeof patch !== 'object') throw new Error('patch is required.');

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: jsonHeaders(token),
      body: JSON.stringify(patch),
    },
  );
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to update calendar event'));
  return normalizeEvent(await res.json());
}

export async function deleteCalendarEventWithToken(
  token: string,
  eventId: string,
): Promise<void> {
  const id = String(eventId || '').trim();
  if (!id) throw new Error('eventId is required.');

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to delete calendar event'));
}
