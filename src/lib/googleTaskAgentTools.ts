import {
  getTask,
  getTaskLists,
  listTasks,
  listAllPendingTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  moveTask,
} from '../services/googleTasksService';

type TaskToolResult =
  | { success: true; provider: 'google_tasks'; operation: string; [key: string]: any }
  | { success: false; provider: 'google_tasks'; errorCode: string; message: string; requiresUserAuth?: boolean };

function tokenOf(token?: string): string | null {
  return token?.trim() || null;
}

function limitOf(value: unknown, fallback = 100): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(200, Math.floor(n))) : fallback;
}

function dayBounds(dateValue: string): { dueMin: string; dueMax: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const start = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  return { dueMin: start.toISOString(), dueMax: new Date(start.getTime() + 86400000).toISOString() };
}

function summarize(task: any) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    ...(task.due ? { due: task.due } : {}),
    ...(task.listId ? { listId: task.listId } : {}),
    ...(task.listTitle ? { list: task.listTitle } : {}),
    ...(task.parent ? { parent: task.parent } : {}),
  };
}

export const googleTaskAgentToolDeclarations = [
  {
    name: 'get_google_task_lists',
    description: 'Get all Google Task lists. Use for task-list overview or to identify the correct list before a task operation.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'get_pending_google_tasks',
    description: 'Get incomplete Google Tasks across all lists. Use for planning, triage, or "what do I still need to do?" requests. Completed tasks are excluded.',
    parameters: { type: 'OBJECT', properties: { maxResults: { type: 'INTEGER' } } },
  },
  {
    name: 'get_google_tasks_due_today',
    description: 'Get incomplete Google Tasks due on a specific local calendar date. Provide YYYY-MM-DD.',
    parameters: { type: 'OBJECT', properties: { date: { type: 'STRING' }, maxResults: { type: 'INTEGER' } }, required: ['date'] },
  },
  {
    name: 'get_overdue_google_tasks',
    description: 'Get incomplete Google Tasks due before the supplied current ISO timestamp.',
    parameters: { type: 'OBJECT', properties: { now: { type: 'STRING' }, maxResults: { type: 'INTEGER' } }, required: ['now'] },
  },
  {
    name: 'get_google_tasks_by_list',
    description: 'Get Google Tasks from one specific task list. Completed tasks are excluded unless explicitly requested.',
    parameters: { type: 'OBJECT', properties: { taskListId: { type: 'STRING' }, includeCompleted: { type: 'BOOLEAN' }, maxResults: { type: 'INTEGER' } }, required: ['taskListId'] },
  },
  {
    name: 'get_google_task',
    description: 'Get one Google Task by task ID and task-list ID when exact details are needed.',
    parameters: { type: 'OBJECT', properties: { taskId: { type: 'STRING' }, taskListId: { type: 'STRING' } }, required: ['taskId', 'taskListId'] },
  },
  {
    name: 'create_google_task',
    description: 'Create a Google Task. This changes external Google data and requires explicit user confirmation.',
    parameters: { type: 'OBJECT', properties: { title: { type: 'STRING' }, notes: { type: 'STRING' }, taskListId: { type: 'STRING' }, parent: { type: 'STRING' }, previous: { type: 'STRING' }, userConfirmed: { type: 'BOOLEAN' } }, required: ['title', 'userConfirmed'] },
  },
  {
    name: 'update_google_task',
    description: 'Update a Google Task title, notes, due date, or completion status. Requires explicit user confirmation.',
    parameters: { type: 'OBJECT', properties: { taskId: { type: 'STRING' }, taskListId: { type: 'STRING' }, title: { type: 'STRING' }, notes: { type: 'STRING' }, due: { type: 'STRING' }, status: { type: 'STRING', enum: ['needsAction', 'completed'] }, userConfirmed: { type: 'BOOLEAN' } }, required: ['taskId', 'taskListId', 'userConfirmed'] },
  },
  {
    name: 'complete_google_task',
    description: 'Mark a Google Task completed. Requires explicit user confirmation.',
    parameters: { type: 'OBJECT', properties: { taskId: { type: 'STRING' }, taskListId: { type: 'STRING' }, userConfirmed: { type: 'BOOLEAN' } }, required: ['taskId', 'taskListId', 'userConfirmed'] },
  },
  {
    name: 'delete_google_task',
    description: 'Delete a Google Task. Requires explicit user confirmation.',
    parameters: { type: 'OBJECT', properties: { taskId: { type: 'STRING' }, taskListId: { type: 'STRING' }, userConfirmed: { type: 'BOOLEAN' } }, required: ['taskId', 'taskListId', 'userConfirmed'] },
  },
  {
    name: 'move_google_task',
    description: 'Move or reorder a Google Task, optionally into another list or under a parent. Requires explicit user confirmation.',
    parameters: { type: 'OBJECT', properties: { taskId: { type: 'STRING' }, taskListId: { type: 'STRING' }, destinationTaskListId: { type: 'STRING' }, parent: { type: 'STRING' }, previous: { type: 'STRING' }, userConfirmed: { type: 'BOOLEAN' } }, required: ['taskId', 'taskListId', 'userConfirmed'] },
  },
];

export const GOOGLE_TASK_AGENT_TOOL_NAMES = new Set(googleTaskAgentToolDeclarations.map((tool) => tool.name));

export async function executeGoogleTaskAgentTool(toolName: string, args: any, accessToken?: string): Promise<TaskToolResult> {
  const token = tokenOf(accessToken);
  if (!token) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_AUTH_REQUIRED', message: 'Google authorization is required before task tools can run.', requiresUserAuth: true };
  const a = args && typeof args === 'object' ? args : {};

  try {
    switch (toolName) {
      case 'get_google_task_lists': {
        const result = await getTaskLists(token);
        return { success: true, provider: 'google_tasks', operation: 'list_lists', count: result.items.length, lists: result.items };
      }
      case 'get_pending_google_tasks': {
        const result = await listAllPendingTasks(token, { maxTotalTasks: limitOf(a.maxResults, 200) });
        return { success: true, provider: 'google_tasks', operation: 'pending_all', totalFetched: result.totalFetched, returnedTasks: result.items.length, truncated: result.truncated, listCount: result.lists.length, tasks: result.items.map(summarize) };
      }
      case 'get_google_tasks_due_today': {
        const date = String(a.date || '').trim();
        const bounds = dayBounds(date);
        if (!bounds) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'date must be YYYY-MM-DD.' };
        const maxResults = limitOf(a.maxResults, 200);
        const lists = await getTaskLists(token);
        const tasks: any[] = [];
        let truncated = false;
        for (const list of lists.items) {
          if (tasks.length >= maxResults) { truncated = true; break; }
          const result = await listTasks(list.id, token, { showCompleted: false, dueMin: bounds.dueMin, dueMax: bounds.dueMax, maxTotalTasks: maxResults - tasks.length });
          tasks.push(...result.items);
          truncated = truncated || Boolean(result.truncated);
        }
        return { success: true, provider: 'google_tasks', operation: 'due_today', date, returnedTasks: tasks.length, truncated, tasks: tasks.map(summarize) };
      }
      case 'get_overdue_google_tasks': {
        const now = new Date(String(a.now || ''));
        if (Number.isNaN(now.getTime())) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'now must be a valid ISO timestamp.' };
        const maxResults = limitOf(a.maxResults, 200);
        const lists = await getTaskLists(token);
        const tasks: any[] = [];
        let truncated = false;
        for (const list of lists.items) {
          if (tasks.length >= maxResults) { truncated = true; break; }
          const result = await listTasks(list.id, token, { showCompleted: false, dueMax: now.toISOString(), maxTotalTasks: maxResults - tasks.length });
          tasks.push(...result.items);
          truncated = truncated || Boolean(result.truncated);
        }
        return { success: true, provider: 'google_tasks', operation: 'overdue', now: now.toISOString(), returnedTasks: tasks.length, truncated, tasks: tasks.map(summarize) };
      }
      case 'get_google_tasks_by_list': {
        const listId = String(a.taskListId || '').trim();
        if (!listId) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'taskListId is required.' };
        const result = await listTasks(listId, token, { showCompleted: a.includeCompleted === true, maxTotalTasks: limitOf(a.maxResults, 200) });
        return { success: true, provider: 'google_tasks', operation: 'list_tasks', listId: result.listId, listTitle: result.listTitle, returnedTasks: result.items.length, truncated: result.truncated, tasks: result.items.map(summarize) };
      }
      case 'get_google_task': {
        const taskId = String(a.taskId || '').trim();
        const listId = String(a.taskListId || '').trim();
        if (!taskId || !listId) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'taskId and taskListId are required.' };
        return { success: true, provider: 'google_tasks', operation: 'get', task: await getTask(taskId, listId, token) };
      }
      case 'create_google_task': {
        if (a.userConfirmed !== true) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_ACTION_CONFIRMATION_REQUIRED', message: 'Explicit user confirmation is required.' };
        const title = String(a.title || '').trim();
        if (!title) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'title is required.' };
        const task = await createTask(title, a.notes ? String(a.notes) : undefined, a.taskListId ? String(a.taskListId) : undefined, token, a.parent ? String(a.parent) : undefined, a.previous ? String(a.previous) : undefined);
        return { success: true, provider: 'google_tasks', operation: 'create', task };
      }
      case 'update_google_task': {
        if (a.userConfirmed !== true) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_ACTION_CONFIRMATION_REQUIRED', message: 'Explicit user confirmation is required.' };
        const taskId = String(a.taskId || '').trim();
        const listId = String(a.taskListId || '').trim();
        if (!taskId || !listId) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_BAD_REQUEST', message: 'taskId and taskListId are required.' };
        const task = await updateTask(taskId, listId, { ...(a.title !== undefined ? { title: String(a.title) } : {}), ...(a.notes !== undefined ? { notes: String(a.notes) } : {}), ...(a.due !== undefined ? { due: String(a.due) } : {}), ...(a.status !== undefined ? { status: a.status === 'completed' ? 'completed' : 'needsAction' } : {}) }, token);
        return { success: true, provider: 'google_tasks', operation: 'update', task };
      }
      case 'complete_google_task': {
        if (a.userConfirmed !== true) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_ACTION_CONFIRMATION_REQUIRED', message: 'Explicit user confirmation is required.' };
        return { success: true, provider: 'google_tasks', operation: 'complete', task: await completeTask(String(a.taskId || '').trim(), String(a.taskListId || '').trim(), token) };
      }
      case 'delete_google_task': {
        if (a.userConfirmed !== true) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_ACTION_CONFIRMATION_REQUIRED', message: 'Explicit user confirmation is required.' };
        return { success: true, provider: 'google_tasks', operation: 'delete', ...(await deleteTask(String(a.taskId || '').trim(), String(a.taskListId || '').trim(), token)) };
      }
      case 'move_google_task': {
        if (a.userConfirmed !== true) return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_ACTION_CONFIRMATION_REQUIRED', message: 'Explicit user confirmation is required.' };
        return { success: true, provider: 'google_tasks', operation: 'move', task: await moveTask(String(a.taskId || '').trim(), String(a.taskListId || '').trim(), token, { ...(a.destinationTaskListId ? { destinationTaskListId: String(a.destinationTaskListId) } : {}), ...(a.parent ? { parent: String(a.parent) } : {}), ...(a.previous ? { previous: String(a.previous) } : {}) }) };
      }
      default:
        return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: `Unknown task agent tool: ${toolName}` };
    }
  } catch (error: any) {
    return { success: false, provider: 'google_tasks', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: String(error?.message || error || 'Google task operation failed') };
  }
}
