import { strict as assert } from 'node:assert';
import test from 'node:test';
import { getAgentConnectionContext, agentToolDeclarations } from '../agentToolRegistry';

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
