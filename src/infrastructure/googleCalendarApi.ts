export interface CalendarEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  start: CalendarEventDateTime;
  end: CalendarEventDateTime;
  location?: string;
  htmlLink?: string;
  status?: string;
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: CalendarEventDateTime;
  eventType?: string;
  transparency?: string;
  visibility?: string;
}

export interface CalendarEventPatch {
  summary?: string;
  description?: string | null;
  start?: CalendarEventDateTime;
  end?: CalendarEventDateTime;
  location?: string | null;
  recurrence?: string[] | null;
  transparency?: string | null;
  visibility?: string | null;
}

export interface CalendarEventCreateOptions {
  recurrence?: string[];
  timeZone?: string;
  calendarId?: string;
}

export interface CalendarListItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone?: string;
  summaryOverride?: string;
  primary?: boolean;
  hidden?: boolean;
  selected?: boolean;
  accessRole?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface CalendarFreeBusyRange {
  start: string;
  end: string;
}

export interface CalendarFreeBusyCalendar {
  busy: CalendarFreeBusyRange[];
  errors?: Array<{ domain?: string; reason?: string }>; 
}

export interface CalendarFreeBusyResponse {
  timeMin: string;
  timeMax: string;
  calendars: Record<string, CalendarFreeBusyCalendar>;
}

export interface CalendarSyncResponse {
  items: CalendarEventItem[];
  nextSyncToken: string;
}

export interface CalendarListSyncResponse {
  items: CalendarListItem[];
  nextSyncToken: string;
}

export class CalendarSyncTokenExpiredError extends Error {
  constructor(message = 'Google Calendar sync token is no longer valid; a full synchronization is required.') {
    super(message);
    this.name = 'CalendarSyncTokenExpiredError';
  }
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

function positiveLimit(value: number, fallback: number, maximum = 2500): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.floor(value), maximum));
}

function normalizeDateTime(value: any): CalendarEventDateTime {
  return {
    dateTime: value?.dateTime,
    date: value?.date,
    timeZone: value?.timeZone,
  };
}

function normalizeEvent(event: any): CalendarEventItem {
  return {
    id: event.id,
    summary: event.summary || '(Untitled Event)',
    description: event.description,
    start: normalizeDateTime(event.start),
    end: normalizeDateTime(event.end),
    location: event.location,
    htmlLink: event.htmlLink,
    status: event.status,
    recurrence: Array.isArray(event.recurrence) ? [...event.recurrence] : undefined,
    recurringEventId: event.recurringEventId,
    originalStartTime: event.originalStartTime ? normalizeDateTime(event.originalStartTime) : undefined,
    eventType: event.eventType,
    transparency: event.transparency,
    visibility: event.visibility,
  };
}

function normalizeCalendarListItem(item: any): CalendarListItem {
  return {
    id: item.id,
    summary: item.summary || item.summaryOverride || '(Untitled Calendar)',
    description: item.description,
    location: item.location,
    timeZone: item.timeZone,
    summaryOverride: item.summaryOverride,
    primary: item.primary,
    hidden: item.hidden,
    selected: item.selected,
    accessRole: item.accessRole,
    colorId: item.colorId,
    backgroundColor: item.backgroundColor,
    foregroundColor: item.foregroundColor,
  };
}

function normalizeFreeBusyResponse(data: any): CalendarFreeBusyResponse {
  const calendars: Record<string, CalendarFreeBusyCalendar> = {};
  for (const [calendarId, calendar] of Object.entries<any>(data?.calendars || {})) {
    calendars[calendarId] = {
      busy: Array.isArray(calendar?.busy)
        ? calendar.busy
            .filter((range: any) => range?.start && range?.end)
            .map((range: any) => ({ start: String(range.start), end: String(range.end) }))
        : [],
      errors: Array.isArray(calendar?.errors)
        ? calendar.errors.map((error: any) => ({
            domain: error?.domain,
            reason: error?.reason,
          }))
        : undefined,
    };
  }

  return {
    timeMin: String(data?.timeMin || ''),
    timeMax: String(data?.timeMax || ''),
    calendars,
  };
}

async function listCalendarEvents(
  token: string,
  calendarId: string,
  initialParams: URLSearchParams,
  maxResults: number,
): Promise<CalendarEventItem[]> {
  const target = positiveLimit(maxResults, 50);
  const safeCalendarId = String(calendarId || 'primary').trim() || 'primary';
  const items: CalendarEventItem[] = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams(initialParams);
    params.set('maxResults', String(Math.min(target, 2500)));
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(safeCalendarId)}/events?${params.toString()}`,
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
  calendarId = 'primary',
): Promise<{ items: CalendarEventItem[] }> {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  return { items: await listCalendarEvents(token, calendarId, params, maxResults) };
}

export async function getCalendarEventsRangeWithToken(
  token: string,
  startTime: string,
  endTime: string,
  maxResults = 50,
  calendarId = 'primary',
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
    items: await listCalendarEvents(token, calendarId, params, maxResults),
  };
}

export async function getCalendarEventWithToken(
  token: string,
  eventId: string,
  calendarId = 'primary',
): Promise<CalendarEventItem> {
  const id = String(eventId || '').trim();
  if (!id) throw new Error('eventId is required.');
  const safeCalendarId = String(calendarId || 'primary').trim() || 'primary';
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(safeCalendarId)}/events/${encodeURIComponent(id)}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch calendar event'));
  return normalizeEvent(await res.json());
}

export async function getCalendarListWithToken(
  token: string,
  maxResults = 50,
): Promise<{ items: CalendarListItem[] }> {
  const target = positiveLimit(maxResults, 50);
  const items: CalendarListItem[] = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams({ maxResults: String(Math.min(target, 250)) });
    if (pageToken) params.set('pageToken', pageToken);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/users/me/calendarList?${params.toString()}`,
      { headers: authHeaders(token) },
    );
    if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch calendar list'));
    const data: any = await res.json();
    for (const item of data.items || []) {
      if (items.length >= target) break;
      items.push(normalizeCalendarListItem(item));
    }
    if (items.length >= target) break;
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return { items };
}

export async function getCalendarEventInstancesWithToken(
  token: string,
  recurringEventId: string,
  options: { timeMin?: string; timeMax?: string; maxResults?: number; calendarId?: string } = {},
): Promise<{ items: CalendarEventItem[] }> {
  const eventId = String(recurringEventId || '').trim();
  if (!eventId) throw new Error('recurringEventId is required.');
  const calendarId = String(options.calendarId || 'primary').trim() || 'primary';
  const maxResults = positiveLimit(options.maxResults ?? 50, 50);
  const params = new URLSearchParams({ maxResults: String(Math.min(maxResults, 2500)) });
  if (options.timeMin) {
    const parsed = new Date(options.timeMin);
    if (Number.isNaN(parsed.getTime())) throw new Error('Valid timeMin is required when provided.');
    params.set('timeMin', parsed.toISOString());
  }
  if (options.timeMax) {
    const parsed = new Date(options.timeMax);
    if (Number.isNaN(parsed.getTime())) throw new Error('Valid timeMax is required when provided.');
    params.set('timeMax', parsed.toISOString());
  }
  if (params.has('timeMin') && params.has('timeMax') && new Date(params.get('timeMax')!) <= new Date(params.get('timeMin')!)) {
    throw new Error('timeMax must be after timeMin.');
  }

  const items: CalendarEventItem[] = [];
  let pageToken = '';
  do {
    const pageParams = new URLSearchParams(params);
    if (pageToken) pageParams.set('pageToken', pageToken);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}/instances?${pageParams.toString()}`,
      { headers: authHeaders(token) },
    );
    if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch recurring event instances'));
    const data: any = await res.json();
    for (const item of data.items || []) {
      if (items.length >= maxResults) break;
      items.push(normalizeEvent(item));
    }
    if (items.length >= maxResults) break;
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return { items };
}

export async function getCalendarFreeBusyWithToken(
  token: string,
  timeMin: string,
  timeMax: string,
  calendarIds: string[],
): Promise<CalendarFreeBusyResponse> {
  const start = new Date(timeMin);
  const end = new Date(timeMax);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Valid timeMin and timeMax are required.');
  }
  if (end <= start) throw new Error('timeMax must be after timeMin.');
  const ids = [...new Set((calendarIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) throw new Error('At least one calendar id is required.');
  if (ids.length > 50) throw new Error('At most 50 calendar ids can be queried at once.');

  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      calendarExpansionMax: ids.length,
      items: ids.map((id) => ({ id })),
    }),
  });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch calendar availability'));
  return normalizeFreeBusyResponse(await res.json());
}

export async function createCalendarEventWithToken(
  token: string,
  summary: string,
  startTime: string,
  endTime: string,
  description?: string,
  location?: string,
  options: CalendarEventCreateOptions = {},
): Promise<CalendarEventItem> {
  const calendarId = String(options.calendarId || 'primary').trim() || 'primary';
  const body: Record<string, unknown> = {
    summary,
    start: { dateTime: startTime, ...(options.timeZone ? { timeZone: options.timeZone } : {}) },
    end: { dateTime: endTime, ...(options.timeZone ? { timeZone: options.timeZone } : {}) },
  };
  if (description) body.description = description;
  if (location) body.location = location;
  if (options.recurrence?.length) body.recurrence = [...options.recurrence];

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
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
  calendarId = 'primary',
): Promise<CalendarEventItem> {
  const id = String(eventId || '').trim();
  if (!id) throw new Error('eventId is required.');
  if (!patch || typeof patch !== 'object') throw new Error('patch is required.');
  const safeCalendarId = String(calendarId || 'primary').trim() || 'primary';

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(safeCalendarId)}/events/${encodeURIComponent(id)}`,
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
  calendarId = 'primary',
): Promise<void> {
  const id = String(eventId || '').trim();
  if (!id) throw new Error('eventId is required.');
  const safeCalendarId = String(calendarId || 'primary').trim() || 'primary';

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(safeCalendarId)}/events/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to delete calendar event'));
}

async function listCalendarSyncPages(
  token: string,
  calendarId: string,
  syncToken?: string,
  pageSize = 2500,
): Promise<CalendarSyncResponse> {
  const safeCalendarId = String(calendarId || 'primary').trim() || 'primary';
  const params = new URLSearchParams({
    showDeleted: 'true',
    maxResults: String(positiveLimit(pageSize, 2500)),
  });
  if (syncToken?.trim()) params.set('syncToken', syncToken.trim());

  const items: CalendarEventItem[] = [];
  let pageToken = '';
  let nextSyncToken = '';

  do {
    const pageParams = new URLSearchParams(params);
    if (pageToken) pageParams.set('pageToken', pageToken);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(safeCalendarId)}/events?${pageParams.toString()}`,
      { headers: authHeaders(token) },
    );
    if (res.status === 410 && syncToken?.trim()) {
      throw new CalendarSyncTokenExpiredError(await parseGoogleApiError(res, 'Calendar incremental sync failed'));
    }
    if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to synchronize calendar events'));

    const data: any = await res.json();
    items.push(...(Array.isArray(data.items) ? data.items.map(normalizeEvent) : []));
    pageToken = data.nextPageToken || '';
    if (!pageToken && typeof data.nextSyncToken === 'string' && data.nextSyncToken.trim()) {
      nextSyncToken = data.nextSyncToken.trim();
    }
  } while (pageToken);

  if (!nextSyncToken) throw new Error('Google Calendar synchronization completed without a nextSyncToken.');
  return { items, nextSyncToken };
}

export async function syncCalendarEventsWithToken(
  token: string,
  calendarId = 'primary',
  syncToken?: string,
  pageSize = 2500,
): Promise<CalendarSyncResponse> {
  return listCalendarSyncPages(token, calendarId, syncToken, pageSize);
}

export async function syncCalendarListWithToken(
  token: string,
  syncToken?: string,
  pageSize = 250,
): Promise<CalendarListSyncResponse> {
  const params = new URLSearchParams({
    showDeleted: 'true',
    showHidden: 'true',
    maxResults: String(positiveLimit(pageSize, 250, 250)),
  });
  if (syncToken?.trim()) params.set('syncToken', syncToken.trim());

  const items: CalendarListItem[] = [];
  let pageToken = '';
  let nextSyncToken = '';

  do {
    const pageParams = new URLSearchParams(params);
    if (pageToken) pageParams.set('pageToken', pageToken);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/users/me/calendarList?${pageParams.toString()}`,
      { headers: authHeaders(token) },
    );
    if (res.status === 410 && syncToken?.trim()) {
      throw new CalendarSyncTokenExpiredError(await parseGoogleApiError(res, 'Calendar list incremental sync failed'));
    }
    if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to synchronize calendar list'));

    const data: any = await res.json();
    items.push(...(Array.isArray(data.items) ? data.items.map(normalizeCalendarListItem) : []));
    pageToken = data.nextPageToken || '';
    if (!pageToken && typeof data.nextSyncToken === 'string' && data.nextSyncToken.trim()) {
      nextSyncToken = data.nextSyncToken.trim();
    }
  } while (pageToken);

  if (!nextSyncToken) throw new Error('Google Calendar list synchronization completed without a nextSyncToken.');
  return { items, nextSyncToken };
}
