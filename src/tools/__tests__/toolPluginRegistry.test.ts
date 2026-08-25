import assert from 'node:assert/strict';
import test from 'node:test';
import { ToolPluginRegistry } from '../toolPluginRegistry';
import { artifactToolPlugin } from '../artifactToolPlugin';
import type { ToolPlugin } from '../toolPluginTypes';
import type { Workspace } from '../../types';

const workspace: Workspace = { id: 'w1', name: 'Test', artifacts: [], activeArtifactId: null };

function plugin(id: string, toolName: string, capabilities = ['workspace.read'] as const, effects = ['read'] as const): ToolPlugin {
  return {
    id,
    version: 1,
    declarations: [{ name: toolName, description: toolName, capabilities, effects }],
    owns: (name) => name === toolName,
    execute: async ({ workspace: currentWorkspace }) => ({ result: { success: true }, updatedWorkspace: currentWorkspace }),
  };
}

test('ToolPluginRegistry derives declarations from independently registered plugins', () => {
  const registry = new ToolPluginRegistry();
  registry.register(plugin('memory', 'remember'));
  registry.register(plugin('voice', 'speak'));

  assert.deepEqual(registry.getPluginIds(), ['memory', 'voice']);
  assert.deepEqual(registry.getDeclarations().map((item) => item.name), ['remember', 'speak']);
});

test('ToolPluginRegistry rejects duplicate plugin ids', () => {
  const registry = new ToolPluginRegistry();
  registry.register(plugin('memory', 'remember'));
  assert.throws(() => registry.register(plugin('memory', 'remember-again')),
    /already registered/);
});

test('ToolPluginRegistry rejects duplicate tool ownership across plugins', () => {
  const registry = new ToolPluginRegistry();
  registry.register(plugin('memory', 'remember'));
  assert.throws(() => registry.register(plugin('other', 'remember')),
    /already owned/);
});

test('ToolPluginRegistry rejects duplicate declarations inside one plugin', () => {
  const registry = new ToolPluginRegistry();
  const invalid: ToolPlugin = {
    id: 'duplicate-tools',
    version: 1,
    declarations: [{ name: 'same' }, { name: 'same' }],
    owns: () => true,
    execute: async ({ workspace: currentWorkspace }) => ({ result: {}, updatedWorkspace: currentWorkspace }),
  };
  assert.throws(() => registry.register(invalid), /more than once/);
});

test('ToolPluginRegistry rejects declarations the plugin does not claim', () => {
  const registry = new ToolPluginRegistry();
  const invalid: ToolPlugin = {
    id: 'invalid',
    version: 1,
    declarations: [{ name: 'declared-but-unowned' }],
    owns: () => false,
    execute: async ({ workspace: currentWorkspace }) => ({ result: {}, updatedWorkspace: currentWorkspace }),
  };

  assert.throws(() => registry.register(invalid), /does not claim/);
});

test('ToolPluginRegistry injects invocation metadata and normalizes the tool name', async () => {
  const registry = new ToolPluginRegistry();
  registry.register({
    id: 'metadata',
    version: 1,
    declarations: [{ name: 'inspect', capabilities: ['workspace.read'], effects: ['read'] }],
    owns: (name) => name === 'inspect',
    execute: async (context) => ({
      result: {
        invocationId: context.invocationId,
        source: context.source,
        pluginId: context.pluginId,
        toolName: context.toolName,
        capabilities: context.capabilities,
        effects: context.effects,
        args: context.args,
      },
      updatedWorkspace: context.workspace,
    }),
  });

  const result = await registry.execute({
    workspace,
    toolName: ' inspect ',
    args: { value: 1 },
    source: 'automation',
  });

  assert.equal(result.result.toolName, 'inspect');
  assert.equal(result.result.pluginId, 'metadata');
  assert.equal(result.result.source, 'automation');
  assert.match(result.result.invocationId, /^tool_/);
  assert.deepEqual(result.result.capabilities, ['workspace.read']);
  assert.deepEqual(result.result.effects, ['read']);
  assert.deepEqual(result.result.args, { value: 1 });
});

test('ToolPluginRegistry exposes the independent artifact plugin with explicit effects and capabilities', () => {
  assert.equal(artifactToolPlugin.id, 'artifacts');
  assert.equal(artifactToolPlugin.declarations.length, 5);
  assert.deepEqual(
    artifactToolPlugin.declarations.find((tool) => tool.name === 'create_artifact')?.capabilities,
    ['workspace.write'],
  );
  assert.deepEqual(
    artifactToolPlugin.declarations.find((tool) => tool.name === 'read_artifact')?.effects,
    ['read'],
  );
});

test('ToolPluginRegistry returns a structured unknown-tool result without invoking another plugin', async () => {
  const registry = new ToolPluginRegistry();
  registry.register(plugin('memory', 'remember'));

  const result = await registry.execute({
    workspace,
    toolName: 'unknown',
    args: {},
  });

  assert.equal(result.result.errorCode, 'UNKNOWN_TOOL');
  assert.equal(result.updatedWorkspace, workspace);
});
