import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTask,
  deleteTask,
  getTask,
  getTaskLists,
  listAllPendingTasks,
  listTasks,
  moveTask,
  updateTask,
} from './googleTasksService';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('getTaskLists paginates all task lists', async () => {
  const urls: string[] = [];
  let call = 0;
  globalThis.fetch = (async (input) => {
    urls.push(String(input));
    call++;
    return call === 1
      ? response({ items: [{ id: 'list-1', title: 'Work' }], nextPageToken: 'next' })
      : response({ items: [{ id: 'list-2', title: 'Personal' }] });
  }) as typeof fetch;

  const result = await getTaskLists('token');
  assert.deepEqual(result.items.map((item) => item.title), ['Work', 'Personal']);
  assert.match(urls[0], /maxResults=100/);
  assert.match(urls[1], /pageToken=next/);
});

test('listTasks retrieves completed-excluded tasks across pages and normalizes list metadata', async () => {
  let call = 0;
  globalThis.fetch = (async (input) => {
    const url = String(input);
    call++;
    if (url.includes('/users/@me/lists')) {
      return response({ items: [{ id: 'list-1', title: 'Work' }] });
    }
    if (call === 2) {
      return response({
        items: [{ id: 'task-1', title: 'Repair', status: 'needsAction', due: '2026-09-04T00:00:00Z', links: [{ type: 'email', link: 'https://mail.google.com/x', description: 'Email' }] }],
        nextPageToken: 'page-2',
      });
    }
    return response({ items: [{ id: 'task-2', title: 'Test', status: 'needsAction' }] });
  }) as typeof fetch;

  const result = await listTasks('list-1', 'token', { showCompleted: false, maxTotalTasks: 10 });
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].listId, 'list-1');
  assert.equal(result.items[0].listTitle, 'Work');
  assert.equal(result.items[0].links?.[0].type, 'email');
});

test('listAllPendingTasks combines pending tasks from every list and respects output cap', async () => {
  const queue = [
    response({ items: [{ id: 'list-1', title: 'Work' }, { id: 'list-2', title: 'Personal' }] }),
    response({ items: [{ id: 'w1', title: 'Work task', status: 'needsAction' }] }),
    response({ items: [{ id: 'p1', title: 'Personal task', status: 'needsAction' }] }),
  ];
  globalThis.fetch = (async () => queue.shift() || response({ items: [] })) as typeof fetch;

  const result = await listAllPendingTasks('token', { maxTotalTasks: 1 });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, 'w1');
  assert.equal(result.truncated, true);
});

test('CRUD and move operations use the documented Tasks endpoints', async () => {
  const urls: string[] = [];
  const methods: string[] = [];
  const bodies: string[] = [];
  let call = 0;
  globalThis.fetch = (async (input, init) => {
    urls.push(String(input));
    methods.push(init?.method || 'GET');
    bodies.push(String(init?.body || ''));
    call++;
    if (call === 1 || call === 3 || call === 5 || call === 7) {
      return response({ items: [{ id: 'list-1', title: 'Work' }, { id: 'list-2', title: 'Done' }] });
    }
    if (methods[methods.length - 1] === 'DELETE') return response({}, 204);
    return response({ id: 'task-1', title: 'Updated', status: 'completed' });
  }) as typeof fetch;

  await createTask('New', 'Notes', 'list-1', 'token');
  await getTask('task-1', 'list-1', 'token');
  await updateTask('task-1', 'list-1', { title: 'Updated', status: 'completed' }, 'token');
  await moveTask('task-1', 'list-1', 'token', { destinationTaskListId: 'list-2', previous: 'task-0' });
  await deleteTask('task-1', 'list-1', 'token');

  assert.ok(methods.includes('POST'));
  assert.ok(methods.includes('PATCH'));
  assert.ok(methods.includes('DELETE'));
  assert.ok(urls.some((url) => url.includes('/move?destinationTasklist=list-2&previous=task-0')));
  assert.ok(bodies.some((body) => body.includes('"title":"New"')));
});
