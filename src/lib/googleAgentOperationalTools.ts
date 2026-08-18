type OperationalResult = { success: true; provider: string; operation: string; [key: string]: any } | { success: false; provider: string; errorCode: string; message: string; requiresUserAuth?: boolean };

function authToken(token?: string): string | null {
  return token && token.trim() ? token.trim() : null;
}

async function googleError(response: Response, provider: string): Promise<OperationalResult> {
  let message = `Google ${provider} request failed (HTTP ${response.status}).`;
  try {
    const body = await response.json();
    message = body?.error?.message || message;
  } catch {
    // keep default
  }
  return {
    success: false,
    provider,
    errorCode: response.status === 401 ? 'GOOGLE_AUTH_REQUIRED'
      : response.status === 403 ? 'GOOGLE_PERMISSION_DENIED'
      : response.status === 404 ? 'GOOGLE_NOT_FOUND'
      : response.status === 429 ? 'GOOGLE_RATE_LIMIT'
      : response.status === 400 ? 'GOOGLE_BAD_REQUEST'
      : response.status >= 500 ? 'GOOGLE_SERVICE_UNAVAILABLE'
      : 'GOOGLE_UNKNOWN_ERROR',
    message,
    requiresUserAuth: response.status === 401 || (response.status === 403 && /scope|permission|authorization/i.test(message)),
  };
}

function rangeQuery(startTime?: string, endTime?: string): { timeMin?: string; timeMax?: string } {
  const result: { timeMin?: string; timeMax?: string } = {};
  if (startTime) {
    const parsed = new Date(startTime);
    if (!Number.isNaN(parsed.getTime())) result.timeMin = parsed.toISOString();
  }
  if (endTime) {
    const parsed = new Date(endTime);
    if (!Number.isNaN(parsed.getTime())) result.timeMax = parsed.toISOString();
  }
  return result;
}

export const googleOperationalToolDeclarations = [
  {
    name: 'search_gmail',
    description: 'Search Gmail using Gmail query syntax. Use a defined date window when investigating historical activity. Start with summaries before reading full messages.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Gmail search query, e.g. "ClickUp" or "from:clickup".' },
        startTime: { type: 'STRING', description: 'Optional ISO start timestamp. Messages older than this are excluded.' },
        endTime: { type: 'STRING', description: 'Optional ISO end timestamp. Messages at/after this are excluded.' },
        maxResults: { type: 'INTEGER', description: 'Maximum summaries to return; default 25.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_gmail_message',
    description: 'Read the full content of a specific Gmail message after search results identify it as relevant.',
    parameters: {
      type: 'OBJECT',
      properties: { messageId: { type: 'STRING', description: 'Gmail message ID.' } },
      required: ['messageId'],
    },
  },
  {
    name: 'get_calendar_events_range',
    description: 'Retrieve Google Calendar events inside an explicit time range. Use this for historical correlation or today/time-window planning.',
    parameters: {
      type: 'OBJECT',
      properties: {
        startTime: { type: 'STRING', description: 'ISO timestamp for the start of the range.' },
        endTime: { type: 'STRING', description: 'ISO timestamp for the end of the range.' },
        maxResults: { type: 'INTEGER', description: 'Maximum events to return; default 50.' },
      },
      required: ['startTime', 'endTime'],
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Create a Google Calendar event. Use only after the user has clearly authorized the schedule and any materially missing timing/order constraints are resolved.',
    parameters: {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING', description: 'Event title.' },
        startTime: { type: 'STRING', description: 'ISO timestamp for event start.' },
        endTime: { type: 'STRING', description: 'ISO timestamp for event end.' },
        description: { type: 'STRING', description: 'Optional event notes.' },
        location: { type: 'STRING', description: 'Optional location or link.' },
      },
      required: ['summary', 'startTime', 'endTime'],
    },
  },
  {
    name: 'list_google_tasks',
    description: 'List Google Tasks. Use when the user explicitly refers to Google Tasks or when task source needs to be distinguished from Google Keep notes.',
    parameters: {
      type: 'OBJECT',
      properties: { taskListId: { type: 'STRING', description: 'Optional Google Tasks list ID.' } },
    },
  },
];

export const GOOGLE_OPERATIONAL_TOOL_NAMES = new Set(googleOperationalToolDeclarations.map((tool) => tool.name));

export async function executeGoogleOperationalTool(toolName: string, args: any, accessToken?: string): Promise<OperationalResult> {
  const token = authToken(accessToken);
  if (!token) {
    return { success: false, provider: 'google', errorCode: 'GOOGLE_AUTH_REQUIRED', message: 'Google authorization is required before this tool can run.', requiresUserAuth: true };
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const safeArgs = args && typeof args === 'object' ? args : {};

  try {
    switch (toolName) {
      case 'search_gmail': {
        const query = String(safeArgs.query || '').trim();
        const maxResults = Math.max(1, Math.min(Number(safeArgs.maxResults || 25), 100));
        const bounds = rangeQuery(safeArgs.startTime, safeArgs.endTime);
        const qParts = [query];
        if (bounds.timeMin) qParts.push(`after:${Math.floor(Date.parse(bounds.timeMin) / 1000)}`);
        if (bounds.timeMax) qParts.push(`before:${Math.floor(Date.parse(bounds.timeMax) / 1000)}`);
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(qParts.join(' '))}`;
        const listRes = await fetch(url, { headers });
        if (!listRes.ok) return await googleError(listRes, 'gmail');
        const listData = await listRes.json();
        const ids: Array<{ id: string; threadId: string }> = listData.messages || [];
        const summaries = await Promise.all(ids.slice(0, maxResults).map(async (item) => {
          try {
            const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, { headers });
            if (!res.ok) return null;
            const detail = await res.json();
            const hdrs = detail.payload?.headers || [];
            const header = (name: string) => hdrs.find((h: any) => String(h.name || '').toLowerCase() === name.toLowerCase())?.value || '';
            return { id: detail.id, threadId: detail.threadId, from: header('From'), to: header('To'), subject: header('Subject'), date: header('Date'), snippet: detail.snippet || '', isUnread: (detail.labelIds || []).includes('UNREAD'), labels: detail.labelIds || [] };
          } catch { return null; }
        }));
        return { success: true, provider: 'google_gmail', operation: 'search', query: qParts.join(' '), count: summaries.filter(Boolean).length, messages: summaries.filter(Boolean) };
      }
      case 'read_gmail_message': {
        const messageId = String(safeArgs.messageId || '').trim();
        if (!messageId) return { success: false, provider: 'google_gmail', errorCode: 'GOOGLE_BAD_REQUEST', message: 'messageId is required.' };
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`, { headers });
        if (!res.ok) return await googleError(res, 'gmail');
        const data = await res.json();
        const headersList = data.payload?.headers || [];
        const header = (name: string) => headersList.find((h: any) => String(h.name || '').toLowerCase() === name.toLowerCase())?.value || '';
        let bodyText = '';
        const decode = (value: string) => {
          try {
            let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return new TextDecoder().decode(bytes);
          } catch { return ''; }
        };
        const walk = (part: any) => { if (!part) return; if (part.mimeType === 'text/plain' && part.body?.data) bodyText += decode(part.body.data); if (Array.isArray(part.parts)) part.parts.forEach(walk); };
        walk(data.payload);
        if (!bodyText && data.snippet) bodyText = data.snippet;
        return { success: true, provider: 'google_gmail', operation: 'read', messageId: data.id, threadId: data.threadId, from: header('From'), to: header('To'), subject: header('Subject'), date: header('Date'), bodyText: bodyText.trim(), labels: data.labelIds || [] };
      }
      case 'get_calendar_events_range': {
        const bounds = rangeQuery(safeArgs.startTime, safeArgs.endTime);
        if (!bounds.timeMin || !bounds.timeMax) return { success: false, provider: 'google_calendar', errorCode: 'GOOGLE_BAD_REQUEST', message: 'Valid startTime and endTime are required.' };
        const maxResults = Math.max(1, Math.min(Number(safeArgs.maxResults || 50), 250));
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(bounds.timeMin)}&timeMax=${encodeURIComponent(bounds.timeMax)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;
        const res = await fetch(url, { headers });
        if (!res.ok) return await googleError(res, 'calendar');
        const data = await res.json();
        return { success: true, provider: 'google_calendar', operation: 'range_read', startTime: bounds.timeMin, endTime: bounds.timeMax, count: (data.items || []).length, events: (data.items || []).map((event: any) => ({ id: event.id, summary: event.summary || '(Untitled)', description: event.description, start: event.start, end: event.end, location: event.location, status: event.status, htmlLink: event.htmlLink })) };
      }
      case 'create_calendar_event': {
        const { summary, startTime, endTime, description, location } = safeArgs;
        if (!summary || !startTime || !endTime) return { success: false, provider: 'google_calendar', errorCode: 'GOOGLE_BAD_REQUEST', message: 'summary, startTime, and endTime are required.' };
        const body: any = { summary: String(summary), start: { dateTime: String(startTime) }, end: { dateTime: String(endTime) } };
        if (description) body.description = String(description);
        if (location) body.location = String(location);
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', headers, body: JSON.stringify(body) });
        if (!res.ok) return await googleError(res, 'calendar');
        const data = await res.json();
        return { success: true, provider: 'google_calendar', operation: 'create', eventId: data.id, summary: data.summary, start: data.start, end: data.end, htmlLink: data.htmlLink };
      }
      case 'list_google_tasks': {
        const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', { headers });
        if (!listRes.ok) return await googleError(listRes, 'tasks');
        const lists = await listRes.json();
        const targetListId = String(safeArgs.taskListId || lists.items?.[0]?.id || '').trim();
        if (!targetListId) return { success: true, provider: 'google_tasks', operation: 'list', count: 0, tasks: [] };
        const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(targetListId)}/tasks?showCompleted=true&maxResults=100`, { headers });
        if (!res.ok) return await googleError(res, 'tasks');
        const data = await res.json();
        return { success: true, provider: 'google_tasks', operation: 'list', listId: targetListId, count: (data.items || []).length, tasks: (data.items || []).map((task: any) => ({ id: task.id, title: task.title || '', notes: task.notes || '', status: task.status, due: task.due, updated: task.updated })) };
      }
      default:
        return { success: false, provider: 'google', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: `Unknown operational Google tool: ${toolName}` };
    }
  } catch (error: any) {
    return { success: false, provider: 'google', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: String(error?.message || error || 'Google operation failed') };
  }
}
