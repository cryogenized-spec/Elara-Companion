import type { AgentToolDeclaration, ToolExecutionContext, ToolExecutionResult, ToolInvocationSource, ToolPlugin } from './toolPluginTypes';

function normalizeToolName(name: string): string {
  return name.trim();
}

function validateDeclaration(pluginId: string, declaration: AgentToolDeclaration, seen: Set<string>): string {
  const name = normalizeToolName(declaration.name || '');
  if (!name) throw new Error(`Tool plugin '${pluginId}' contains a declaration without a name.`);
  if (seen.has(name)) throw new Error(`Tool plugin '${pluginId}' declares tool '${name}' more than once.`);
  seen.add(name);

  if (declaration.parameters !== undefined && (typeof declaration.parameters !== 'object' || declaration.parameters === null)) {
    throw new Error(`Tool '${name}' in plugin '${pluginId}' has invalid parameters metadata.`);
  }
  if (declaration.capabilities?.some((capability) => typeof capability !== 'string')) {
    throw new Error(`Tool '${name}' in plugin '${pluginId}' has invalid capability metadata.`);
  }
  if (declaration.effects?.some((effect) => typeof effect !== 'string')) {
    throw new Error(`Tool '${name}' in plugin '${pluginId}' has invalid effect metadata.`);
  }
  return name;
}

export interface ToolExecutionOptions {
  source?: ToolInvocationSource;
  googleToken?: string;
}

export class ToolPluginRegistry {
  private readonly plugins = new Map<string, ToolPlugin>();
  private readonly toolOwners = new Map<string, string>();

  register(plugin: ToolPlugin): void {
    const pluginId = plugin.id?.trim();
    if (!pluginId) throw new Error('Tool plugin must have a non-empty id.');
    if (plugin.version !== 1) throw new Error(`Unsupported tool plugin version for '${pluginId}'.`);
    if (this.plugins.has(pluginId)) throw new Error(`Tool plugin '${pluginId}' is already registered.`);
    if (!plugin.declarations.length) throw new Error(`Tool plugin '${pluginId}' must declare at least one tool.`);

    const seen = new Set<string>();
    const normalizedNames = plugin.declarations.map((declaration) => validateDeclaration(pluginId, declaration, seen));
    for (let index = 0; index < plugin.declarations.length; index += 1) {
      const declaration = plugin.declarations[index];
      const name = normalizedNames[index];
      if (!plugin.owns(name)) throw new Error(`Tool plugin '${pluginId}' does not claim its declared tool '${name}'.`);
      const owner = this.toolOwners.get(name);
      if (owner) throw new Error(`Tool '${name}' is already owned by plugin '${owner}'.`);
      if (declaration.name !== name) throw new Error(`Tool plugin '${pluginId}' must declare normalized tool names.`);
    }

    this.plugins.set(pluginId, { ...plugin, id: pluginId });
    for (const name of normalizedNames) this.toolOwners.set(name, pluginId);
  }

  registerAll(plugins: readonly ToolPlugin[]): void {
    for (const plugin of plugins) this.register(plugin);
  }

  getPluginForTool(toolName: string): ToolPlugin | null {
    const pluginId = this.toolOwners.get(normalizeToolName(toolName));
    return pluginId ? this.plugins.get(pluginId) || null : null;
  }

  getDeclarations(): AgentToolDeclaration[] {
    return Array.from(this.plugins.values()).flatMap((plugin) => plugin.declarations.map((declaration) => ({ ...declaration })));
  }

  getPluginIds(): string[] {
    return Array.from(this.plugins.keys());
  }

  async execute(context: Omit<ToolExecutionContext, 'invocationId' | 'pluginId' | 'capabilities' | 'effects'> & ToolExecutionOptions): Promise<ToolExecutionResult> {
    const toolName = normalizeToolName(context.toolName);
    const plugin = this.getPluginForTool(toolName);
    if (!plugin) {
      return {
        result: { success: false, error: `Unknown agent tool: ${toolName}`, errorCode: 'UNKNOWN_TOOL' },
        updatedWorkspace: context.workspace,
      };
    }

    const declaration = plugin.declarations.find((candidate) => candidate.name === toolName);
    if (!declaration) {
      return {
        result: { success: false, error: `Tool '${toolName}' is not declared by its registered owner.`, errorCode: 'TOOL_DECLARATION_MISMATCH' },
        updatedWorkspace: context.workspace,
      };
    }

    const executionContext: ToolExecutionContext = {
      ...context,
      toolName,
      args: context.args && typeof context.args === 'object' ? { ...context.args } : {},
      invocationId: `tool_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      source: context.source || 'model',
      pluginId: plugin.id,
      capabilities: Object.freeze([...(declaration.capabilities || [])]),
      effects: Object.freeze([...(declaration.effects || [])]),
    };

    if (plugin.authorize) {
      const authorization = await plugin.authorize(executionContext);
      if (!authorization.allowed) return { result: authorization.result, updatedWorkspace: executionContext.workspace };
    }

    return plugin.execute(executionContext);
  }
}
