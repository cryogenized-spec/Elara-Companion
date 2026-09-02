export interface CalendarWatchChannel {
  id: string;
  resourceId: string;
  resourceUri?: string;
  token?: string;
  expiration?: string;
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

function normalizeChannel(data: any): CalendarWatchChannel {
  if (!data?.id || !data?.resourceId) throw new Error('Google Calendar watch response did not contain a channel id and resource id.');
  return {
    id: String(data.id),
    resourceId: String(data.resourceId),
    resourceUri: data.resourceUri ? String(data.resourceUri) : undefined,
    token: data.token ? String(data.token) : undefined,
    expiration: data.expiration != null ? String(data.expiration) : undefined,
  };
}

export interface CalendarWatchOptions {
  notificationAddress: string;
  channelId?: string;
  token?: string;
  expiration?: number | string;
}

export async function watchCalendarEventsWithToken(
  token: string,
  calendarId = 'primary',
  options: CalendarWatchOptions,
): Promise<CalendarWatchChannel> {
  const address = String(options?.notificationAddress || '').trim();
  if (!address) throw new Error('notificationAddress is required.');
  const parsedAddress = new URL(address);
  if (parsedAddress.protocol !== 'https:') throw new Error('notificationAddress must use HTTPS.');

  const safeCalendarId = String(calendarId || 'primary').trim() || 'primary';
  const channelId = String(options.channelId || crypto.randomUUID()).trim();
  if (!channelId || channelId.length > 64) throw new Error('channelId must be 1-64 characters.');
  const body: Record<string, unknown> = {
    id: channelId,
    type: 'web_hook',
    address,
  };
  if (options.token) body.token = String(options.token);
  if (options.expiration != null) body.expiration = String(options.expiration);

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(safeCalendarId)}/events/watch`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to create Google Calendar watch channel'));
  return normalizeChannel(await res.json());
}

export async function stopCalendarWatchWithToken(token: string, channelId: string, resourceId: string): Promise<void> {
  const id = String(channelId || '').trim();
  const resource = String(resourceId || '').trim();
  if (!id) throw new Error('channelId is required.');
  if (!resource) throw new Error('resourceId is required.');

  const res = await fetch('https://www.googleapis.com/calendar/v3/channels/stop', {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ id, resourceId: resource }),
  });
  if (!res.ok && res.status !== 404) throw new Error(await parseGoogleApiError(res, 'Failed to stop Google Calendar watch channel'));
}
