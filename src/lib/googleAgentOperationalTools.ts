import { getGmailMessageDetails, listGmailMessages } from '../services/googleGmailService';
import { getTasks } from '../services/googleTasksService';
import { createCalendarEvent, getCalendarEventsRange } from '../services/googleCalendarService';

type OperationalResult = { success: true; provider: string; operation: string; [key: string]: any } | { success: false; provider: string; errorCode: string; message: string; requiresUserAuth?: boolean };

function authToken(token?: string): string | null {
  return token && token.trim() ? token.trim() : null;
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
    parameters: { type: 'OBJECT', properties: { query: { type: 'STRING', description: 'Gmail search query, e.g. "ClickUp" or "from:clickup".' }, startTime: { type: 'STRING', description: 'Optional ISO start timestamp. Messages older than this are excluded.' }, endTime: { type: 'STRING', description: 'Optional ISO end timestamp. Messages at/after this are excluded.' }, maxResults: { type: 'INTEGER', description: 'Maximum summaries to return; default 25.' } }, required: ['query'] },
  },
  {
    name: 'read_gmail_message',
    description: 'Read the full content of a specific Gmail message after search results identify it as relevant.',
    parameters: { type: 'OBJECT', properties: { messageId: { type: 'STRING', description: 'Gmail message ID.' } }, required: ['messageId'] },
  },
  {
    name: 'get_calendar_events_range',
    description: 'Retrieve Google Calendar events inside an explicit time range. Use this for historical correlation or today/time-window planning.',
    parameters: { type: 'OBJECT', properties: { startTime: { type: 'STRING', description: 'ISO timestamp for the start of the range.' }, endTime: { type: 'STRING', description: 'ISO timestamp for the end of the range.' }, maxResults: { type: 'INTEGER', description: 'Maximum events to return; default 50.' } }, required: ['startTime', 'endTime'] },
  },
  {
    name: 'create_calendar_event',
    description: 'Create a Google Calendar event. Use only after the user has clearly authorized the schedule and any materially missing timing/order constraints are resolved.',
    parameters: { type: 'OBJECT', properties: { summary: { type: 'STRING', description: 'Event title.' }, startTime: { type: 'STRING', description: 'ISO timestamp for event start.' }, endTime: { type: 'STRING', description: 'ISO timestamp for event end.' }, description: { type: 'STRING', description: 'Optional event notes.' }, location: { type: 'STRING', description: 'Optional location or link.' } }, required: ['summary', 'startTime', 'endTime'] },
  },
  {
    name: 'list_google_tasks',
    description: 'List Google Tasks. Use when the user explicitly refers to Google Tasks or when task source needs to be distinguished from Google Keep notes.',
    parameters: { type: 'OBJECT', properties: { taskListId: { type: 'STRING', description: 'Optional Google Tasks list ID.' } } },
  },
];

export const GOOGLE_OPERATIONAL_TOOL_NAMES = new Set(googleOperationalToolDeclarations.map((tool) => tool.name));

export async function executeGoogleOperationalTool(toolName: string, args: any, accessToken?: string): Promise<OperationalResult> {
  const token = authToken(accessToken);
  if (!token) return { success: false, provider: 'google', errorCode: 'GOOGLE_AUTH_REQUIRED', message: 'Google authorization is required before this tool can run.', requiresUserAuth: true };
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
        const result = await listGmailMessages(qParts.join(' ').trim(), maxResults, token);
        return { success: true, provider: 'google_gmail', operation: 'search', query: qParts.join(' ').trim(), count: result.messages.length, messages: result.messages };
      }
      case 'read_gmail_message': {
        const messageId = String(safeArgs.messageId || '').trim();
        if (!messageId) return { success: false, provider: 'google_gmail', errorCode: 'GOOGLE_BAD_REQUEST', message: 'messageId is required.' };
        const message = await getGmailMessageDetails(messageId, token);
        return { success: true, provider: 'google_gmail', operation: 'read', ...message };
      }
      case 'get_calendar_events_range': {
        const bounds = rangeQuery(safeArgs.startTime, safeArgs.endTime);
        if (!bounds.timeMin || !bounds.timeMax) return { success: false, provider: 'google_calendar', errorCode: 'GOOGLE_BAD_REQUEST', message: 'Valid startTime and endTime are required.' };
        const maxResults = Math.max(1, Math.min(Number(safeArgs.maxResults || 50), 250));
        const result = await getCalendarEventsRange(bounds.timeMin, bounds.timeMax, maxResults, token);
        return { success: true, provider: 'google_calendar', operation: 'range_read', startTime: result.startTime, endTime: result.endTime, count: result.items.length, events: result.items };
      }
      case 'create_calendar_event': {
        const { summary, startTime, endTime, description, location } = safeArgs;
        if (!summary || !startTime || !endTime) return { success: false, provider: 'google_calendar', errorCode: 'GOOGLE_BAD_REQUEST', message: 'summary, startTime, and endTime are required.' };
        const result = await createCalendarEvent(String(summary), String(startTime), String(endTime), description ? String(description) : undefined, location ? String(location) : undefined, token);
        return { success: true, provider: 'google_calendar', operation: 'create', eventId: result.id, summary: result.summary, start: result.start, end: result.end, htmlLink: result.htmlLink };
      }
      case 'list_google_tasks': {
        const result = await getTasks(safeArgs.taskListId ? String(safeArgs.taskListId) : undefined, token);
        return { success: true, provider: 'google_tasks', operation: 'list', listId: safeArgs.taskListId || undefined, listTitle: result.listTitle, count: result.items.length, tasks: result.items };
      }
      default:
        return { success: false, provider: 'google', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: `Unknown operational Google tool: ${toolName}` };
    }
  } catch (error: any) {
    return { success: false, provider: 'google', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: String(error?.message || error || 'Google operation failed') };
  }
}
