import { describe, expect, it } from 'vitest';
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

describe('ToolPluginRegistry', () => {
  it('derives declarations from independently registered plugins', () => {
    const registry = new ToolPluginRegistry();
    registry.register(plugin('memory', 'remember'));
    registry.register(plugin('voice', 'speak'));

    expect(registry.getPluginIds()).toEqual(['memory', 'voice']);
    expect(registry.getDeclarations().map((item) => item.name)).toEqual(['remember', 'speak']);
  });

  it('rejects duplicate plugin ids', () => {
    const registry = new ToolPluginRegistry();
    registry.register(plugin('memory', 'remember'));
    expect(() => registry.register(plugin('memory', 'remember-again'))).toThrow(/already registered/);
  });

  it('rejects duplicate tool ownership across plugins', () => {
    const registry = new ToolPluginRegistry();
    registry.register(plugin('memory', 'remember'));
    expect(() => registry.register(plugin('other', 'remember'))).toThrow(/already owned/);
  });

  it('rejects duplicate declarations inside one plugin', () => {
    const registry = new ToolPluginRegistry();
    const invalid: ToolPlugin = {
      id: 'duplicate-tools',
      version: 1,
      declarations: [{ name: 'same' }, { name: 'same' }],
      owns: () => true,
      execute: async ({ workspace: currentWorkspace }) => ({ result: {}, updatedWorkspace: currentWorkspace }),
    };
    expect(() => registry.register(invalid)).toThrow(/more than once/);
  });

  it('rejects declarations the plugin does not claim', () => {
    const registry = new ToolPluginRegistry();
    const invalid: ToolPlugin = {
      id: 'invalid',
      version: 1,
      declarations: [{ name: 'declared-but-unowned' }],
      owns: () => false,
      execute: async ({ workspace: currentWorkspace }) => ({ result: {}, updatedWorkspace: currentWorkspace }),
    };

    expect(() => registry.register(invalid)).toThrow(/does not claim/);
  });

  it('injects invocation metadata and normalizes the tool name', async () => {
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

    expect(result.result.toolName).toBe('inspect');
    expect(result.result.pluginId).toBe('metadata');
    expect(result.result.source).toBe('automation');
    expect(result.result.invocationId).toMatch(/^tool_/);
    expect(result.result.capabilities).toEqual(['workspace.read']);
    expect(result.result.effects).toEqual(['read']);
    expect(result.result.args).toEqual({ value: 1 });
  });

  it('exposes the independent artifact plugin with explicit effects and capabilities', () => {
    expect(artifactToolPlugin.id).toBe('artifacts');
    expect(artifactToolPlugin.declarations).toHaveLength(5);
    expect(artifactToolPlugin.declarations.find((tool) => tool.name === 'create_artifact')?.capabilities).toEqual(['workspace.write']);
    expect(artifactToolPlugin.declarations.find((tool) => tool.name === 'read_artifact')?.effects).toEqual(['read']);
  });

  it('returns a structured unknown-tool result without invoking another plugin', async () => {
    const registry = new ToolPluginRegistry();
    registry.register(plugin('memory', 'remember'));

    const result = await registry.execute({
      workspace,
      toolName: 'unknown',
      args: {},
    });

    expect(result.result.errorCode).toBe('UNKNOWN_TOOL');
    expect(result.updatedWorkspace).toBe(workspace);
  });
});
