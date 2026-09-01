import { strict as assert } from 'node:assert';
import test from 'node:test';
import { executeGoogleTaskAgentTool, googleTaskAgentToolDeclarations, GOOGLE_TASK_AGENT_TOOL_NAMES } from './googleTaskAgentTools';

test('Google task agent exposes intent-level planning tools and explicit write tools', () => {
  const names = googleTaskAgentToolDeclarations.map((tool) => tool.name);
  for (const required of [
    'get_google_task_lists',
    'get_pending_google_tasks',
    'get_google_tasks_due_today',
    'get_overdue_google_tasks',
    'get_google_tasks_by_list',
    'get_google_task',
    'create_google_task',
    'update_google_task',
    'complete_google_task',
    'delete_google_task',
    'move_google_task',
  ]) {
    assert.ok(names.includes(required), `missing tool ${required}`);
    assert.equal(GOOGLE_TASK_AGENT_TOOL_NAMES.has(required), true);
  }
});

test('Google task reads fail cleanly when authorization is unavailable', async () => {
  const result = await executeGoogleTaskAgentTool('get_pending_google_tasks', {}, undefined);
  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'GOOGLE_AUTH_REQUIRED');
  assert.equal(result.requiresUserAuth, true);
});

test('Google task writes do not execute without explicit confirmation', async () => {
  const result = await executeGoogleTaskAgentTool('complete_google_task', { taskId: 'task-1', taskListId: 'list-1' }, 'token');
  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'GOOGLE_ACTION_CONFIRMATION_REQUIRED');
});
