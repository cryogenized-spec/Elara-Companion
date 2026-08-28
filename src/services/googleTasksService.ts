import { googleCapabilities, googleIdentity } from './googleWorkspaceService';
import type { GoogleCapability } from './googleWorkspaceService';

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
function jsonHeaders(token: string) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }

export interface TaskItem { id: string; title: string; notes?: string; status: 'needsAction' | 'completed'; due?: string; updated?: string; }

export async function getTaskLists(explicitToken?: string) {
  const token = await getGoogleFamilyAccessToken('tasks', explicitToken);
  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch task lists'));
  const d = await res.json();
  return { items: (d.items || []).map((l: any) => ({ id: l.id, title: l.title || 'Tasks' })) };
}

export async function getTasks(taskListId?: string, explicitToken?: string): Promise<{ items: TaskItem[]; listTitle?: string }> {
  const token = await getGoogleFamilyAccessToken('tasks', explicitToken);
  let id = taskListId;
  let title = 'My Tasks';
  if (!id) {
    const lists = await getTaskLists(explicitToken);
    if (!lists.items.length) return { items: [], listTitle: 'None' };
    id = lists.items[0].id;
    title = lists.items[0].title;
  }
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${id}/tasks?showCompleted=true&maxResults=20`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch tasks'));
  const d = await res.json();
  return { items: (d.items || []).map((t: any) => ({ id: t.id, title: t.title || '(Untitled Task)', notes: t.notes, status: t.status || 'needsAction', due: t.due, updated: t.updated })), listTitle: title };
}

export async function createTask(title: string, notes?: string, taskListId?: string, explicitToken?: string): Promise<TaskItem> {
  const token = await getGoogleFamilyAccessToken('tasks', explicitToken);
  let id = taskListId;
  if (!id) {
    const lists = await getTaskLists(explicitToken);
    if (!lists.items.length) throw new Error('No Google Task lists found.');
    id = lists.items[0].id;
  }
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${id}/tasks`, { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify({ title, ...(notes ? { notes } : {}) }) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to create task'));
  return res.json();
}

/** Marks a Google Task complete without moving OAuth/token handling into the UI. */
export async function completeTask(taskId: string, taskListId?: string, explicitToken?: string): Promise<TaskItem> {
  const token = await getGoogleFamilyAccessToken('tasks', explicitToken);
  let id = taskListId;
  if (!id) {
    const lists = await getTaskLists(explicitToken);
    if (!lists.items.length) throw new Error('No Google Task lists found.');
    id = lists.items[0].id;
  }
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${id}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: jsonHeaders(token),
    body: JSON.stringify({ status: 'completed' }),
  });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to complete task'));
  return res.json();
}
