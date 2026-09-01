import { googleCapabilities, googleIdentity } from './googleWorkspaceService';
import type { GoogleCapability } from './googleWorkspaceService';

const TASKS_BASE_URL = 'https://tasks.googleapis.com/tasks/v1';
const MAX_PAGE_SIZE = 100;
const MAX_TOOL_ITEMS = 200;

async function getGoogleFamilyAccessToken(capability: GoogleCapability, explicitToken?: string): Promise<string> {
  const provided = explicitToken?.trim();
  if (provided) return provided;
  const token = googleIdentity.getAccessToken();
  if (token && googleCapabilities.isGranted(googleCapabilities.getGrantedScopes(), capability)) return token;
  return googleIdentity.requestCapabilityAuthorization(googleCapabilities.getScopes(capability), false);
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

function authHeaders(token: string) { return { Authorization: `Bearer ${token}` }; }
function jsonHeaders(token: string) { return { ...authHeaders(token), 'Content-Type': 'application/json' }; }
function clampInt(value: unknown, fallback: number, max: number): number { const n = Number(value); return Number.isFinite(n) ? Math.max(1, Math.min(max, Math.floor(n))) : fallback; }

export interface TaskLink { type: string; description?: string; link: string; }
export interface TaskItem {
  id: string; title: string; notes?: string; status: 'needsAction' | 'completed'; due?: string; completed?: string; updated?: string;
  parent?: string; position?: string; deleted?: boolean; hidden?: boolean; links?: TaskLink[]; webViewLink?: string;
  assignmentInfo?: Record<string, unknown>; spaceInfo?: Record<string, unknown>; listId?: string; listTitle?: string;
}
export interface TaskListItem { id: string; title: string; updated?: string; }
export interface ListTasksOptions {
  showCompleted?: boolean; showHidden?: boolean; showDeleted?: boolean; dueMin?: string; dueMax?: string; updatedMin?: string;
  completedMin?: string; completedMax?: string; maxTotalTasks?: number;
}
export interface ListTasksResult { items: TaskItem[]; listId?: string; listTitle?: string; nextPageToken?: string; truncated?: boolean; totalFetched?: number; }

function normalizeTask(raw: any, list?: TaskListItem): TaskItem {
  return {
    id: String(raw?.id || ''), title: String(raw?.title || '(Untitled Task)'),
    ...(raw?.notes !== undefined ? { notes: String(raw.notes) } : {}), status: raw?.status === 'completed' ? 'completed' : 'needsAction',
    ...(raw?.due ? { due: String(raw.due) } : {}), ...(raw?.completed ? { completed: String(raw.completed) } : {}),
    ...(raw?.updated ? { updated: String(raw.updated) } : {}), ...(raw?.parent ? { parent: String(raw.parent) } : {}),
    ...(raw?.position ? { position: String(raw.position) } : {}), ...(raw?.deleted ? { deleted: true } : {}),
    ...(raw?.hidden ? { hidden: true } : {}), ...(Array.isArray(raw?.links) ? { links: raw.links.filter((l: any) => l?.link).map((l: any) => ({ type: String(l.type || 'link'), ...(l.description ? { description: String(l.description) } : {}), link: String(l.link) })) } : {}),
    ...(raw?.webViewLink ? { webViewLink: String(raw.webViewLink) } : {}), ...(raw?.assignmentInfo ? { assignmentInfo: raw.assignmentInfo } : {}),
    ...(raw?.spaceInfo ? { spaceInfo: raw.spaceInfo } : {}), ...(list ? { listId: list.id, listTitle: list.title } : {}),
  };
}

async function fetchTaskListsPage(token: string, pageToken?: string): Promise<{ items: TaskListItem[]; nextPageToken?: string }> {
  const params = new URLSearchParams({ maxResults: String(MAX_PAGE_SIZE) }); if (pageToken) params.set('pageToken', pageToken);
  const res = await fetch(`${TASKS_BASE_URL}/users/@me/lists?${params.toString()}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch task lists'));
  const data = await res.json();
  return { items: (data.items || []).map((l: any) => ({ id: String(l.id), title: String(l.title || 'Tasks'), ...(l.updated ? { updated: String(l.updated) } : {}) })), nextPageToken: data.nextPageToken ? String(data.nextPageToken) : undefined };
}

export async function getTaskLists(explicitToken?: string): Promise<{ items: TaskListItem[]; nextPageToken?: string }> {
  const token = await getGoogleFamilyAccessToken('tasks', explicitToken); const items: TaskListItem[] = []; let pageToken: string | undefined;
  do { const page = await fetchTaskListsPage(token, pageToken); items.push(...page.items); pageToken = page.nextPageToken; } while (pageToken);
  return { items };
}

async function fetchTaskPage(taskListId: string, token: string, pageToken: string | undefined, options: ListTasksOptions, list: TaskListItem): Promise<{ items: TaskItem[]; nextPageToken?: string }> {
  const params = new URLSearchParams({ maxResults: String(MAX_PAGE_SIZE), showCompleted: String(options.showCompleted ?? false), showHidden: String(options.showHidden ?? false), showDeleted: String(options.showDeleted ?? false) });
  if (pageToken) params.set('pageToken', pageToken);
  for (const [key, value] of [['dueMin', options.dueMin], ['dueMax', options.dueMax], ['updatedMin', options.updatedMin], ['completedMin', options.completedMin], ['completedMax', options.completedMax]] as const) if (value) params.set(key, value);
  const res = await fetch(`${TASKS_BASE_URL}/lists/${encodeURIComponent(taskListId)}/tasks?${params.toString()}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, `Failed to fetch tasks from ${list.title}`));
  const data = await res.json();
  return { items: (data.items || []).map((t: any) => normalizeTask(t, list)), nextPageToken: data.nextPageToken ? String(data.nextPageToken) : undefined };
}

async function listTasksForKnownList(taskListId: string, token: string, options: ListTasksOptions, list: TaskListItem): Promise<ListTasksResult> {
  const maxTotalTasks = Math.min(clampInt(options.maxTotalTasks, MAX_TOOL_ITEMS, MAX_TOOL_ITEMS), MAX_TOOL_ITEMS);
  const items: TaskItem[] = []; let pageToken: string | undefined; let truncated = false; let totalFetched = 0;
  do {
    const page = await fetchTaskPage(taskListId, token, pageToken, options, list); totalFetched += page.items.length;
    const remaining = maxTotalTasks - items.length; items.push(...page.items.slice(0, Math.max(0, remaining)));
    if (page.items.length > remaining) truncated = true; pageToken = page.nextPageToken;
    if (items.length >= maxTotalTasks) { truncated = truncated || Boolean(pageToken); break; }
  } while (pageToken);
  return { items, listId: list.id, listTitle: list.title, nextPageToken: pageToken, truncated, totalFetched };
}

export async function listTasks(taskListId: string, explicitToken?: string, options: ListTasksOptions = {}): Promise<ListTasksResult> {
  const token = await getGoogleFamilyAccessToken('tasks', explicitToken); const lists = await getTaskLists(token); const list = lists.items.find((i) => i.id === taskListId);
  if (!list) throw new Error(`Google Task list not found: ${taskListId}`);
  return listTasksForKnownList(taskListId, token, options, list);
}

export async function listAllPendingTasks(explicitToken?: string, options: Omit<ListTasksOptions, 'showCompleted'> = {}): Promise<{ items: TaskItem[]; lists: TaskListItem[]; truncated: boolean; totalFetched: number }> {
  const token = await getGoogleFamilyAccessToken('tasks', explicitToken); const listsResult = await getTaskLists(token); const maxTotalTasks = Math.min(clampInt(options.maxTotalTasks, MAX_TOOL_ITEMS, MAX_TOOL_ITEMS), MAX_TOOL_ITEMS);
  const items: TaskItem[] = []; let truncated = false; let totalFetched = 0;
  for (const list of listsResult.items) {
    if (items.length >= maxTotalTasks) { truncated = true; break; }
    const result = await listTasksForKnownList(list.id, token, { ...options, showCompleted: false, maxTotalTasks: maxTotalTasks - items.length }, list);
    items.push(...result.items); totalFetched += result.totalFetched || result.items.length; truncated = truncated || Boolean(result.truncated);
  }
  return { items, lists: listsResult.items, truncated, totalFetched };
}

export async function getTask(taskId: string, taskListId: string, explicitToken?: string): Promise<TaskItem> {
  const token = await getGoogleFamilyAccessToken('tasks', explicitToken); const lists = await getTaskLists(token); const list = lists.items.find((i) => i.id === taskListId); if (!list) throw new Error(`Google Task list not found: ${taskListId}`);
  const res = await fetch(`${TASKS_BASE_URL}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch task')); return normalizeTask(await res.json(), list);
}

export async function createTask(title: string, notes?: string, taskListId?: string, explicitToken?: string, parent?: string, previous?: string): Promise<TaskItem> {
  const token = await getGoogleFamilyAccessToken('tasks', explicitToken); const id = taskListId || (await getTaskLists(token)).items[0]?.id; if (!id) throw new Error('No Google Task lists found.');
  const params = new URLSearchParams(); if (parent) params.set('parent', parent); if (previous) params.set('previous', previous); const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${TASKS_BASE_URL}/lists/${encodeURIComponent(id)}/tasks${suffix}`, { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify({ title, ...(notes ? { notes } : {}) }) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to create task')); const lists = await getTaskLists(token); return normalizeTask(await res.json(), lists.items.find((i) => i.id === id));
}

export async function updateTask(taskId: string, taskListId: string, patch: Partial<Pick<TaskItem, 'title' | 'notes' | 'status' | 'due'>>, explicitToken?: string): Promise<TaskItem> {
  const token = await getGoogleFamilyAccessToken('tasks', explicitToken); const body: Record<string, string> = {};
  if (patch.title !== undefined) body.title = patch.title; if (patch.notes !== undefined) body.notes = patch.notes; if (patch.status !== undefined) body.status = patch.status; if (patch.due !== undefined) body.due = patch.due;
  if (!Object.keys(body).length) throw new Error('No task fields were supplied for update.');
  const res = await fetch(`${TASKS_BASE_URL}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`, { method: 'PATCH', headers: jsonHeaders(token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to update task')); const lists = await getTaskLists(token); return normalizeTask(await res.json(), lists.items.find((i) => i.id === taskListId));
}
export async function completeTask(taskId: string, taskListId: string, explicitToken?: string): Promise<TaskItem> { return updateTask(taskId, taskListId, { status: 'completed' }, explicitToken); }
export async function deleteTask(taskId: string, taskListId: string, explicitToken?: string): Promise<{ id: string; deleted: true }> {
  const token = await getGoogleFamilyAccessToken('tasks', explicitToken); const res = await fetch(`${TASKS_BASE_URL}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE', headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to delete task')); return { id: taskId, deleted: true };
}
export async function moveTask(taskId: string, taskListId: string, explicitToken?: string, options: { destinationTaskListId?: string; parent?: string; previous?: string } = {}): Promise<TaskItem> {
  const token = await getGoogleFamilyAccessToken('tasks', explicitToken); const params = new URLSearchParams(); if (options.destinationTaskListId) params.set('destinationTasklist', options.destinationTaskListId); if (options.parent) params.set('parent', options.parent); if (options.previous) params.set('previous', options.previous); const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${TASKS_BASE_URL}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}/move${suffix}`, { method: 'POST', headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to move task')); const lists = await getTaskLists(token); const destinationId = options.destinationTaskListId || taskListId; return normalizeTask(await res.json(), lists.items.find((i) => i.id === destinationId));
}
export async function getTasks(taskListId?: string, explicitToken?: string, options: ListTasksOptions = {}): Promise<ListTasksResult> { if (taskListId) return listTasks(taskListId, explicitToken, options); const result = await listAllPendingTasks(explicitToken, options); return { items: result.items, truncated: result.truncated, totalFetched: result.totalFetched }; }
