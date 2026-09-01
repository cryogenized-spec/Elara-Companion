import {
  createTask,
  deleteTask,
  getTask,
  getTaskLists,
  listAllPendingTasks,
  listTasks,
  moveTask,
  updateTask,
} from '../services/googleTasksService';
import { getGmailMessageDetails, listGmailMessages } from '../services/googleGmailService';
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

const TASK_WRITE_CONFIRMATION_DESCRIPTION = 'Explicit user confirmation is required before changing or deleting Google Tasks.';

export const googleOperationalToolDeclarations = [
  {
    name: 'search_gmail',
    description: 'Search Gmail using Gmail query syntax. Use a defined date window when investigating historical activity. Start with summaries before reading full messages.',
    parameters: { type: 'OBJECT', properties: { query: { type: 'STRING', description: 'Gmail search query.' }, startTime: { type: 'STRING', description: 'Optional ISO start timestamp.' }, endTime: { type: 'STRING', description: 'Optional ISO end timestamp.' }, maxResults: { type: 'INTEGER', description: 'Maximum summaries to return; default 25.' } }, required: ['query'] },
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
    name: 'list_google_task_lists',
    description: 'List all Google Task lists available to the user.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'list_google_tasks',
    description: 'List Google Tasks. With no taskListId, returns pending tasks across all task lists. Completed tasks are excluded by default. Use a task list ID for one list. The result is intentionally capped to keep Gemini context compact.',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskListId: { type: 'STRING', description: 'Optional Google Task list ID. Omit to search all task lists.' },
        includeCompleted: { type: 'BOOLEAN', description: 'Include completed tasks. Default false.' },
        dueMin: { type: 'STRING', description: 'Optional RFC3339 lower bound for due date.' },
        dueMax: { type: 'STRING', description: 'Optional RFC3339 upper bound for due date.' },
        updatedMin: { type: 'STRING', description: 'Optional RFC3339 lower bound for last update.' },
        maxTasks: { type: 'INTEGER', description: 'Maximum tasks returned across all lists; default 200.' },
      },
    },
  },
  {
    name: 'get_google_task',
    description: 'Get one Google Task by task ID and task list ID.',
    parameters: { type: 'OBJECT', properties: { taskId: { type: 'STRING', description: 'Google Task ID.' }, taskListId: { type: 'STRING', description: 'Google Task list ID.' } }, required: ['taskId', 'taskListId'] },
  },
  {
    name: 'create_google_task',
    description: `Create a Google Task. ${TASK_WRITE_CONFIRMATION_DESCRIPTION}`,
    parameters: { type: 'OBJECT', properties: { title: { type: 'STRING', description: 'Task title.' }, notes: { type: 'STRING', description: 'Optional task notes.' }, taskListId: { type: 'STRING', description: 'Optional task list ID; defaults to the first list.' }, parent: { type: 'STRING', description: 'Optional parent task ID.' }, previous: { type: 'STRING', description: 'Optional previous sibling task ID.' }, userConfirmed: { type: 'BOOLEAN', description: 'Must be true only after explicit user confirmation.' } }, required: ['title', 'userConfirmed'] },
  },
  {
    name: 'update_google_task',
    description: `Update a Google Task title, notes, due date, or completion status. ${TASK_WRITE_CONFIRMATION_DESCRIPTION}`,
    parameters: { type: 'OBJECT', properties: { taskId: { type: 'STRING', description: 'Google Task ID.' }, taskListId: { type: 'STRING', description: 'Google Task list ID.' }, title: { type: 'STRING', description: 'Optional replacement title.' }, notes: { type: 'STRING', description: 'Optional replacement notes.' }, due: { type: 'STRING', description: 'Optional RFC3339 due date. Google Tasks stores date precision only.' }, status: { type: 'STRING', enum: ['needsAction', 'completed'], description: 'Optional status.' }, userConfirmed: { type: 'BOOLEAN', description: 'Must be true only after explicit user confirmation.' } }, required: ['taskId', 'taskListId', 'userConfirmed'] },
  },
  {
    name: 'complete_google_task',
    description: `Complete a Google Task. ${TASK_WRITE_CONFIRMATION_DESCRIPTION}`,
    parameters: { type: 'OBJECT', properties: { taskId: { type: 'STRING', description: 'Google Task ID.' }, taskListId: { type: 'STRING', description: 'Google Task list ID.' }, userConfirmed: { type: 'BOOLEAN', description: 'Must be true only after explicit user confirmation.' } }, required: ['taskId', 'taskListId', 'userConfirmed'] },
  },
  {
    name: 'delete_google_task',
    description: `Delete a Google Task. ${TASK_WRITE_CONFIRMATION_DESCRIPTION}`,
    parameters: { type: 'OBJECT', properties: { taskId: { type: 'STRING', description: 'Google Task ID.' }, taskListId: { type: 'STRING', description: 'Google Task list ID.' }, userConfirmed: { type: 'BOOLEAN', description: 'Must be true only after explicit user confirmation.' } }, required: ['taskId', 'taskListId', 'userConfirmed'] },
  },
  {
    name: 'move_google_task',
    description: `Move or reorder a Google Task within the same list, or move it to another list. ${TASK_WRITE_CONFIRMATION_DESCRIPTION}`,
    parameters: { type: 'OBJECT', properties: { taskId: { type: 'STRING', description: 'Google Task ID.' }, taskListId: { type: 'STRING', description: 'Current Google Task list ID.' }, destinationTaskListId: { type: 'STRING', description: 'Optional destination task list ID.' }, parent: { type: 'STRING', description: 'Optional new parent task ID.' }, previous: { type: 'STRING', description: 'Optional previous sibling task ID.' }, userConfirmed: { type: 'BOOLEAN', description: 'Must be true only after explicit user confirmation.' } }, required: ['taskId', 'taskListId', 'userConfirmed'] },
  },
];

export const GOOGLE_OPERATIONAL_TOOL_NAMES = new Set(googleOperationalToolDeclarations.map((tool) => tool.name));

function requireConfirmedWrite(args: any): OperationalResult | null {
  if (args?.userConfirmed === true) return null;
  return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_CONFIRMATION_REQUIRED', message: 'Explicit user confirmation is required before changing Google Tasks.' };
}

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
      case 'list_google_task_lists': {
        const result = await getTaskLists(token);
        return { success: true, provider: 'google_tasks', operation: 'list_task_lists', count: result.items.length, lists: result.items };
      }
      case 'list_google_tasks': {
        const options = {
          showCompleted: safeArgs.includeCompleted === true,
          dueMin: typeof safeArgs.dueMin === 'string' ? safeArgs.dueMin : undefined,
          dueMax: typeof safeArgs.dueMax === 'string' ? safeArgs.dueMax : undefined,
          updatedMin: typeof safeArgs.updatedMin === 'string' ? safeArgs.updatedMin : undefined,
          maxTotalTasks: Math.max(1, Math.min(Number(safeArgs.maxTasks || 200), 200)),
        };
        if (safeArgs.taskListId) {
          const result = await listTasks(String(safeArgs.taskListId), token, options);
          return { success: true, provider: 'google_tasks', operation: 'list', listId: result.listId, listTitle: result.listTitle, count: result.items.length, totalFetched: result.totalFetched, truncated: Boolean(result.truncated), tasks: result.items };
        }
        const result = options.showCompleted
          ? await getTaskLists(token).then(async (lists) => {
              const merged: any[] = [];
              let truncated = false;
              let totalFetched = 0;
              for (const list of lists.items) {
                if (merged.length >= options.maxTotalTasks!) { truncated = true; break; }
                const remaining = options.maxTotalTasks! - merged.length;
                const page = await listTasks(list.id, token, { ...options, maxTotalTasks: remaining });
                merged.push(...page.items);
                totalFetched += page.totalFetched || page.items.length;
                truncated = truncated || Boolean(page.truncated);
              }
              return { items: merged, lists: lists.items, truncated, totalFetched };
            })
          : await listAllPendingTasks(token, options);
        return { success: true, provider: 'google_tasks', operation: 'list_all', listCount: result.lists.length, count: result.items.length, totalFetched: result.totalFetched, truncated: result.truncated, tasks: result.items };
      }
      case 'get_google_task': {
        const taskId = String(safeArgs.taskId || '').trim();
        const taskListId = String(safeArgs.taskListId || '').trim();
        if (!taskId || !taskListId) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'taskId and taskListId are required.' };
        return { success: true, provider: 'google_tasks', operation: 'get', task: await getTask(taskId, taskListId, token) };
      }
      case 'create_google_task': {
        const confirmationError = requireConfirmedWrite(safeArgs);
        if (confirmationError) return confirmationError;
        const title = String(safeArgs.title || '').trim();
        if (!title) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'title is required.' };
        const task = await createTask(title, safeArgs.notes ? String(safeArgs.notes) : undefined, safeArgs.taskListId ? String(safeArgs.taskListId) : undefined, token, safeArgs.parent ? String(safeArgs.parent) : undefined, safeArgs.previous ? String(safeArgs.previous) : undefined);
        return { success: true, provider: 'google_tasks', operation: 'create', task };
      }
      case 'update_google_task': {
        const confirmationError = requireConfirmedWrite(safeArgs);
        if (confirmationError) return confirmationError;
        const taskId = String(safeArgs.taskId || '').trim();
        const taskListId = String(safeArgs.taskListId || '').trim();
        if (!taskId || !taskListId) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'taskId and taskListId are required.' };
        const task = await updateTask(taskId, taskListId, {
          ...(safeArgs.title !== undefined ? { title: String(safeArgs.title) } : {}),
          ...(safeArgs.notes !== undefined ? { notes: String(safeArgs.notes) } : {}),
          ...(safeArgs.due !== undefined ? { due: String(safeArgs.due) } : {}),
          ...(safeArgs.status === 'completed' || safeArgs.status === 'needsAction' ? { status: safeArgs.status } : {}),
        }, token);
        return { success: true, provider: 'google_tasks', operation: 'update', task };
      }
      case 'complete_google_task': {
        const confirmationError = requireConfirmedWrite(safeArgs);
        if (confirmationError) return confirmationError;
        const taskId = String(safeArgs.taskId || '').trim();
        const taskListId = String(safeArgs.taskListId || '').trim();
        if (!taskId || !taskListId) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'taskId and taskListId are required.' };
        return { success: true, provider: 'google_tasks', operation: 'complete', task: await updateTask(taskId, taskListId, { status: 'completed' }, token) };
      }
      case 'delete_google_task': {
        const confirmationError = requireConfirmedWrite(safeArgs);
        if (confirmationError) return confirmationError;
        const taskId = String(safeArgs.taskId || '').trim();
        const taskListId = String(safeArgs.taskListId || '').trim();
        if (!taskId || !taskListId) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'taskId and taskListId are required.' };
        return { success: true, provider: 'google_tasks', operation: 'delete', task: await deleteTask(taskId, taskListId, token) };
      }
      case 'move_google_task': {
        const confirmationError = requireConfirmedWrite(safeArgs);
        if (confirmationError) return confirmationError;
        const taskId = String(safeArgs.taskId || '').trim();
        const taskListId = String(safeArgs.taskListId || '').trim();
        if (!taskId || !taskListId) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'taskId and taskListId are required.' };
        const task = await moveTask(taskId, taskListId, token, {
          ...(safeArgs.destinationTaskListId ? { destinationTaskListId: String(safeArgs.destinationTaskListId) } : {}),
          ...(safeArgs.parent ? { parent: String(safeArgs.parent) } : {}),
          ...(safeArgs.previous ? { previous: String(safeArgs.previous) } : {}),
        });
        return { success: true, provider: 'google_tasks', operation: 'move', task };
      }
      default:
        return { success: false, provider: 'google', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: `Unknown operational Google tool: ${toolName}` };
    }
  } catch (error: any) {
    return { success: false, provider: 'google', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: String(error?.message || error || 'Google operation failed') };
  }
}
