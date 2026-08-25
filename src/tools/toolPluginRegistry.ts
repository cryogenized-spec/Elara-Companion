import type { AgentToolDeclaration, ToolExecutionContext, ToolExecutionResult, ToolPlugin } from './toolPluginTypes';

export class ToolPluginRegistry {
  private readonly plugins = new Map<string, ToolPlugin>();
  private readonly toolOwners = new Map<string, string>();

  register(plugin: ToolPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Tool plugin '${plugin.id}' is already registered.`);
    }
    if (!plugin.declarations.length) {
      throw new Error(`Tool plugin '${plugin.id}' must declare at least one tool.`);
    }

    for (const declaration of plugin.declarations) {
      const name = declaration.name?.trim();
      if (!name) throw new Error(`Tool plugin '${plugin.id}' contains a declaration without a name.`);
      if (!plugin.owns(name)) {
        throw new Error(`Tool plugin '${plugin.id}' does not claim its declared tool '${name}'.`);
      }
      const owner = this.toolOwners.get(name);
      if (owner) throw new Error(`Tool '${name}' is already owned by plugin '${owner}'.`);
    }

    this.plugins.set(plugin.id, plugin);
    for (const declaration of plugin.declarations) this.toolOwners.set(declaration.name, plugin.id);
  }

  registerAll(plugins: readonly ToolPlugin[]): void {
    for (const plugin of plugins) this.register(plugin);
  }

  getPluginForTool(toolName: string): ToolPlugin | null {
    const pluginId = this.toolOwners.get(toolName);
    return pluginId ? this.plugins.get(pluginId) || null : null;
  }

  getDeclarations(): AgentToolDeclaration[] {
    return Array.from(this.plugins.values()).flatMap((plugin) => plugin.declarations.map((declaration) => ({ ...declaration })));
  }

  getPluginIds(): string[] {
    return Array.from(this.plugins.keys());
  }

  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const plugin = this.getPluginForTool(context.toolName);
    if (!plugin) {
      return {
        result: { success: false, error: `Unknown agent tool: ${context.toolName}`, errorCode: 'UNKNOWN_TOOL' },
        updatedWorkspace: context.workspace,
      };
    }

    if (plugin.authorize) {
      const authorization = await plugin.authorize(context);
      if (!authorization.allowed) {
        return { result: authorization.result, updatedWorkspace: context.workspace };
      }
    }

    return plugin.execute(context);
  }
}
