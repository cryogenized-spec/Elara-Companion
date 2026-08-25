import { describe, expect, it } from 'vitest';
import { ToolPluginRegistry } from '../toolPluginRegistry';
import type { ToolPlugin } from '../toolPluginTypes';
import type { Workspace } from '../../types';

const workspace: Workspace = { id: 'w1', name: 'Test', artifacts: [], activeArtifactId: null };

function plugin(id: string, toolName: string): ToolPlugin {
  return {
    id,
    version: 1,
    declarations: [{ name: toolName, description: toolName }],
    owns: (name) => name === toolName,
    execute: async () => ({ result: { success: true }, updatedWorkspace: workspace }),
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

  it('rejects declarations the plugin does not claim', () => {
    const registry = new ToolPluginRegistry();
    const invalid: ToolPlugin = {
      id: 'invalid',
      version: 1,
      declarations: [{ name: 'declared-but-unowned' }],
      owns: () => false,
      execute: async () => ({ result: {}, updatedWorkspace: workspace }),
    };

    expect(() => registry.register(invalid)).toThrow(/does not claim/);
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
