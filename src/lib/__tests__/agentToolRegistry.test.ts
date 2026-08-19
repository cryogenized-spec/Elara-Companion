import { strict as assert } from 'node:assert';
import test from 'node:test';
import { getAgentConnectionContext, agentToolDeclarations, executeAgentTool } from '../agentToolRegistry';

test('agent registry exposes the canonical Google connection context', () => {
  const context = getAgentConnectionContext();
  assert.equal(typeof context, 'string');
  assert.ok(context.includes('[GOOGLE WORKSPACE]'));
});

test('agent registry exposes a single combined tool declaration surface', () => {
  const names = agentToolDeclarations.map((tool: any) => tool.name);
  assert.ok(names.includes('create_artifact'));
  assert.ok(names.includes('create_google_doc'));
  assert.ok(names.includes('sync_to_google_doc'));
  assert.equal(new Set(names).size, names.length);
});

test('external Google write declarations require explicit confirmation', () => {
  const writeTools = agentToolDeclarations.filter((tool: any) =>
    ['create_calendar_event', 'create_google_sheet', 'write_google_sheet_range', 'delete_google_keep_note'].includes(tool.name),
  );

  assert.equal(writeTools.length, 4);
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

  assert.equal(result.updatedWorkspace, workspace);
  assert.equal(result.result.allowed, false);
  assert.equal(result.result.errorCode, 'GOOGLE_ACTION_CONFIRMATION_REQUIRED');
});
