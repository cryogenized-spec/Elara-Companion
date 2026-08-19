import { strict as assert } from 'node:assert';
import test from 'node:test';
import { getAgentConnectionContext, agentToolDeclarations, executeAgentTool } from '../agentToolRegistry';
import { markGoogleAuthInvalid, clearGoogleAuthInvalid, isGoogleAuthInvalidated } from '../googleAuthLifecycle';

test('agent registry exposes the canonical Google connection context', () => {
  clearGoogleAuthInvalid();
  const context = getAgentConnectionContext();
  assert.equal(typeof context, 'string');
  assert.ok(context.includes('[GOOGLE WORKSPACE]'));
});

test('agent registry exposes a single combined tool declaration surface', () => {
  const names = agentToolDeclarations.map((tool: any) => tool.name);
  assert.ok(names.includes('create_artifact'));
  assert.ok(names.includes('create_google_doc'));
  assert.ok(names.includes('sync_to_google_doc'));
  assert.ok(names.includes('disconnect_google_workspace'));
  assert.equal(new Set(names).size, names.length);
});

test('external Google write declarations require explicit confirmation', () => {
  const writeTools = agentToolDeclarations.filter((tool: any) =>
    ['create_calendar_event', 'create_google_sheet', 'write_google_sheet_range', 'delete_google_keep_note', 'create_google_doc', 'update_google_doc', 'sync_to_google_doc', 'sync_from_google_doc', 'disconnect_google_workspace'].includes(tool.name),
  );

  assert.equal(writeTools.length, 9);
  for (const tool of writeTools) {
    assert.ok(tool.parameters.required.includes('userConfirmed'));
    assert.equal(tool.parameters.properties.userConfirmed.type, 'BOOLEAN');
  }
});

test('agent registry blocks unconfirmed Google writes before network dispatch', async () => {
  const workspace = { id: 'test', name: 'Test', artifacts: [], activeArtifactId: null } as any;
  const result = await executeAgentTool(
    workspace,
    'create_google_sheet',
    { title: 'Unsafe test write' },
    'token',
  );

  assert.deepEqual(result.updatedWorkspace, workspace);
  assert.equal(result.result.allowed, false);
  assert.equal(result.result.errorCode, 'GOOGLE_ACTION_CONFIRMATION_REQUIRED');
});

test('agent registry blocks Workspace-backed Google document writes before dispatch', async () => {
  const workspace = { id: 'test', name: 'Test', artifacts: [], activeArtifactId: null } as any;
  const result = await executeAgentTool(
    workspace,
    'update_google_doc',
    { documentId: 'doc-1', content: 'unsafe' },
    'token',
  );

  assert.deepEqual(result.updatedWorkspace, workspace);
  assert.equal(result.result.allowed, false);
  assert.equal(result.result.errorCode, 'GOOGLE_ACTION_CONFIRMATION_REQUIRED');
});

test('Google session invalidation is reflected in the runtime connection context', () => {
  clearGoogleAuthInvalid();
  markGoogleAuthInvalid();
  assert.equal(isGoogleAuthInvalidated(), true);
  assert.ok(getAgentConnectionContext().includes('invalidated'));
  clearGoogleAuthInvalid();
});

test('disconnect operation requires explicit confirmation before revocation', async () => {
  const workspace = { id: 'test', name: 'Test', artifacts: [], activeArtifactId: null } as any;
  const result = await executeAgentTool(
    workspace,
    'disconnect_google_workspace',
    {},
    undefined,
  );

  assert.equal(result.result.allowed, false);
  assert.equal(result.result.errorCode, 'GOOGLE_ACTION_CONFIRMATION_REQUIRED');
});
