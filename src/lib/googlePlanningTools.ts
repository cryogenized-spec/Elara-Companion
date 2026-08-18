type PlanningToolSuccess = { success: true; provider: string; operation: string; [key: string]: any };
type PlanningToolFailure = { success: false; provider: string; errorCode: string; message: string; requiresUserAuth?: boolean };
export type PlanningToolResult = PlanningToolSuccess | PlanningToolFailure;

function authHeaders(token: string, json = false): Record<string, string> {
  return json
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { Authorization: `Bearer ${token}` };
}

async function parseError(res: Response, provider: string): Promise<PlanningToolFailure> {
  let message = `Google ${provider} request failed (HTTP ${res.status}).`;
  try {
    const body = await res.json();
    message = body?.error?.message || message;
  } catch {
    // keep fallback
  }
  const errorCode = res.status === 401 ? 'GOOGLE_AUTH_REQUIRED'
    : res.status === 403 ? 'GOOGLE_PERMISSION_DENIED'
      : res.status === 404 ? 'GOOGLE_NOT_FOUND'
        : res.status === 429 ? 'GOOGLE_RATE_LIMIT'
          : res.status === 400 ? 'GOOGLE_BAD_REQUEST'
            : res.status >= 500 ? 'GOOGLE_SERVICE_UNAVAILABLE'
              : 'GOOGLE_UNKNOWN_ERROR';
  return {
    success: false,
    provider,
    errorCode,
    message,
    requiresUserAuth: res.status === 401 || (res.status === 403 && /scope|permission|authorization/i.test(message)),
  };
}

function validToken(token?: string): string | null {
  return token?.trim() ? token.trim() : null;
}

function toGmailDate(dateLike: string): string {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${dateLike}`);
  return date.toISOString().slice(0, 10).replaceAll('-', '/');
}

function buildGmailQuery(query: string | undefined, after?: string, before?: string): string {
  const parts: string[] = [];
  if (query?.trim()) parts.push(query.trim());
  if (after) parts.push(`after:${toGmailDate(after)}`);
  if (before) parts.push(`before:${toGmailDate(before)}`);
  return parts.join(' ').trim();
}

export const googlePlanningToolDeclarations = [
  {
    name: 'search_gmail_messages',
    description: 'Search Gmail using optional Gmail query terms and explicit after/before dates. Prefer this scoped search before reading full messages. Use it for investigations such as "ClickUp emails from the past 7 days".',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Optional Gmail search terms, e.g. from:, subject:, is:unread, ClickUp.' },
        after: { type: 'STRING', description: 'Optional inclusive investigation start as ISO date/time.' },
        before: { type: 'STRING', description: 'Optional exclusive investigation end as ISO date/time.' },
        maxResults: { type: 'INTEGER', description: 'Maximum summaries to return, up to 100.' },
      },
    },
  },
  {
    name: 'read_gmail_message',
    description: 'Read the full content of a specific Gmail message after a scoped search identifies it as relevant.',
    parameters: {
      type: 'OBJECT',
      properties: { messageId: { type: 'STRING', description: 'Gmail message ID.' } },
      required: ['messageId'],
    },
  },
  {
    name: 'get_calendar_events_range',
    description: 'Read Google Calendar events within an explicit time window. Use this for historical correlation as well as today/future planning.',
    parameters: {
      type: 'OBJECT',
      properties: {
        startTime: { type: 'STRING', description: 'ISO 8601 start time.' },
        endTime: { type: 'STRING', description: 'ISO 8601 end time.' },
        maxResults: { type: 'INTEGER', description: 'Maximum events to return, up to 250.' },
      },
      required: ['startTime', 'endTime'],
    },
  },
  {
    name: 'create_google_calendar_event',
    description: 'Create a Google Calendar event after the user has supplied or clearly authorized the schedule parameters.',
    parameters: {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING', description: 'Event title.' },
        startTime: { type: 'STRING', description: 'ISO 8601 start time.' },
        endTime: { type: 'STRING', description: 'ISO 8601 end time.' },
        description: { type: 'STRING', description: 'Optional event description.' },
        location: { type: 'STRING', description: 'Optional location or meeting link.' },
      },
      required: ['summary', 'startTime', 'endTime'],
    },
  },
  {
    name: 'list_google_tasks',
    description: 'List Google Tasks from an explicit task list. Use this when the user means Google Tasks. Keep and Elara Local Notes are separate providers.',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskListId: { type: 'STRING', description: 'Optional Google Tasks list ID.' },
        maxResults: { type: 'INTEGER', description: 'Maximum tasks to return, up to 100.' },
        showCompleted: { type: 'BOOLEAN', description: 'Whether completed tasks should be included.' },
      },
    },
  },
  {
    name: 'list_google_task_lists',
    description: 'List Google Tasks lists so the agent can identify the correct task source.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'create_google_task',
    description: 'Create a Google Task. Use only after the user explicitly asks to create a task or has clearly authorized task creation.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Task title.' },
        notes: { type: 'STRING', description: 'Optional notes.' },
        taskListId: { type: 'STRING', description: 'Optional task list ID.' },
      },
      required: ['title'],
    },
  },
];

export const GOOGLE_PLANNING_TOOL_NAMES = new Set(googlePlanningToolDeclarations.map((tool) => tool.name));

export async function executeGooglePlanningTool(toolName: string, args: any, accessToken?: string): Promise<PlanningToolResult> {
  const token = validToken(accessToken);
  if (!token) return { success: false, provider: 'google', errorCode: 'GOOGLE_AUTH_REQUIRED', message: 'Google authorization is required before this tool can run.', requiresUserAuth: true };
  const safeArgs = args && typeof args === 'object' ? args : {};

  try {
    switch (toolName) {
      case 'search_gmail_messages': {
        const maxResults = Math.max(1, Math.min(Number(safeArgs.maxResults || 50), 100));
        const q = buildGmailQuery(String(safeArgs.query || ''), safeArgs.after, safeArgs.before);
        let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
        if (q) url += `&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: authHeaders(token) });
        if (!res.ok) return parseError(res, 'gmail');
        const list = await res.json();
        const raw = Array.isArray(list.messages) ? list.messages : [];
        const messages = await Promise.all(raw.slice(0, maxResults).map(async (item: any) => {
          try {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, { headers: authHeaders(token) });
            if (!detailRes.ok) return null;
            const detail = await detailRes.json();
            const headers = detail.payload?.headers || [];
            const getHeader = (name: string) => headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
            return {
              id: detail.id,
              threadId: detail.threadId,
              from: getHeader('From'),
              to: getHeader('To'),
              subject: getHeader('Subject'),
              date: getHeader('Date'),
              snippet: detail.snippet || '',
              isUnread: (detail.labelIds || []).includes('UNREAD'),
              labels: detail.labelIds || [],
            };
          } catch {
            return null;
          }
        }));
        return { success: true, provider: 'google_gmail', operation: 'search', query: q, count: messages.filter(Boolean).length, messages: messages.filter(Boolean) };
      }
      case 'read_gmail_message': {
        const id = String(safeArgs.messageId || '').trim();
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`, { headers: authHeaders(token) });
        if (!res.ok) return parseError(res, 'gmail');
        const data = await res.json();
        const headers = data.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
        const decode = (value: string): string => {
          try {
            let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return new TextDecoder().decode(bytes);
          } catch { return ''; }
        };
        let bodyText = '';
        let bodyHtml = '';
        const walk = (part: any) => {
          if (!part) return;
          if (part.mimeType === 'text/plain' && part.body?.data) bodyText += decode(part.body.data);
          if (part.mimeType === 'text/html' && part.body?.data) bodyHtml += decode(part.body.data);
          for (const child of part.parts || []) walk(child);
        };
        walk(data.payload);
        if (!bodyText && data.snippet) bodyText = data.snippet;
        return { success: true, provider: 'google_gmail', operation: 'read', messageId: data.id, threadId: data.threadId, from: getHeader('From'), to: getHeader('To'), subject: getHeader('Subject'), date: getHeader('Date'), bodyText: bodyText.trim(), bodyHtml: bodyHtml.trim() || undefined };
      }
      case 'get_calendar_events_range': {
        const start = new Date(String(safeArgs.startTime || '')).toISOString();
        const end = new Date(String(safeArgs.endTime || '')).toISOString();
        const maxResults = Math.max(1, Math.min(Number(safeArgs.maxResults || 100), 250));
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;
        const res = await fetch(url, { headers: authHeaders(token) });
        if (!res.ok) return parseError(res, 'calendar');
        const data = await res.json();
        const events = (data.items || []).map((e: any) => ({ id: e.id, summary: e.summary || '(Untitled Event)', description: e.description, start: e.start || {}, end: e.end || {}, location: e.location, status: e.status, htmlLink: e.htmlLink }));
        return { success: true, provider: 'google_calendar', operation: 'range_read', startTime: start, endTime: end, count: events.length, events, nextPageToken: data.nextPageToken };
      }
      case 'create_google_calendar_event': {
        const summary = String(safeArgs.summary || '').trim();
        const startTime = new Date(String(safeArgs.startTime || '')).toISOString();
        const endTime = new Date(String(safeArgs.endTime || '')).toISOString();
        if (!summary) return { success: false, provider: 'google_calendar', errorCode: 'GOOGLE_BAD_REQUEST', message: 'A calendar event title is required.' };
        const body: any = { summary, start: { dateTime: startTime }, end: { dateTime: endTime } };
        if (safeArgs.description) body.description = String(safeArgs.description);
        if (safeArgs.location) body.location = String(safeArgs.location);
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', headers: authHeaders(token, true), body: JSON.stringify(body) });
        if (!res.ok) return parseError(res, 'calendar');
        const event = await res.json();
        return { success: true, provider: 'google_calendar', operation: 'create', eventId: event.id, summary: event.summary, start: event.start, end: event.end, htmlLink: event.htmlLink };
      }
      case 'list_google_task_lists': {
        const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=100', { headers: authHeaders(token) });
        if (!res.ok) return parseError(res, 'tasks');
        const data = await res.json();
        return { success: true, provider: 'google_tasks', operation: 'list_lists', lists: (data.items || []).map((l: any) => ({ id: l.id, title: l.title })) };
      }
      case 'list_google_tasks': {
        let taskListId = String(safeArgs.taskListId || '').trim();
        if (!taskListId) {
          const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=100', { headers: authHeaders(token) });
          if (!listsRes.ok) return parseError(listsRes, 'tasks');
          const lists = await listsRes.json();
          taskListId = lists.items?.[0]?.id || '';
        }
        if (!taskListId) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_NOT_FOUND', message: 'No Google Tasks list was found.' };
        const maxResults = Math.max(1, Math.min(Number(safeArgs.maxResults || 100), 100));
        const showCompleted = safeArgs.showCompleted !== false;
        const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks?showCompleted=${showCompleted}&showHidden=false&maxResults=${maxResults}`;
        const res = await fetch(url, { headers: authHeaders(token) });
        if (!res.ok) return parseError(res, 'tasks');
        const data = await res.json();
        return { success: true, provider: 'google_tasks', operation: 'list', taskListId, tasks: (data.items || []).map((t: any) => ({ id: t.id, title: t.title || '', notes: t.notes || '', status: t.status, due: t.due, updated: t.updated, completed: t.completed })) };
      }
      case 'create_google_task': {
        let taskListId = String(safeArgs.taskListId || '').trim();
        if (!taskListId) {
          const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=100', { headers: authHeaders(token) });
          if (!listsRes.ok) return parseError(listsRes, 'tasks');
          const lists = await listsRes.json();
          taskListId = lists.items?.[0]?.id || '';
        }
        if (!taskListId) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_NOT_FOUND', message: 'No Google Tasks list was found.' };
        const body = { title: String(safeArgs.title || '').trim(), ...(safeArgs.notes ? { notes: String(safeArgs.notes) } : {}) };
        if (!body.title) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'A task title is required.' };
        const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks`, { method: 'POST', headers: authHeaders(token, true), body: JSON.stringify(body) });
        if (!res.ok) return parseError(res, 'tasks');
        const task = await res.json();
        return { success: true, provider: 'google_tasks', operation: 'create', taskListId, taskId: task.id, title: task.title, notes: task.notes, status: task.status };
      }
      default:
        return { success: false, provider: 'google', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: `Unknown planning tool: ${toolName}` };
    }
  } catch (error: any) {
    return { success: false, provider: toolName.includes('gmail') ? 'google_gmail' : toolName.includes('calendar') ? 'google_calendar' : 'google_tasks', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: String(error?.message || error || 'Google planning operation failed') };
  }
}
