import { getGoogleRuntimeStatus } from './googleRuntime';
import { createBuiltinToolPluginRegistry } from '../tools/builtinToolPlugins';
import type { ToolExecutionResult } from '../tools/toolPluginTypes';
import type { Workspace } from '../types';

const toolRegistry = createBuiltinToolPluginRegistry();

export const agentToolDeclarations = toolRegistry.getDeclarations();
export type AgentToolExecution = ToolExecutionResult;

export function getAgentConnectionContext(): string {
  return getGoogleRuntimeStatus().hint;
}

export async function executeAgentTool(
  workspace: Workspace,
  toolName: string,
  args: any,
  googleToken?: string,
): Promise<AgentToolExecution> {
  return toolRegistry.execute({
    workspace,
    toolName,
    args: args && typeof args === 'object' ? args : {},
    googleToken,
  });
}

export function getRegisteredAgentToolPluginIds(): string[] {
  return toolRegistry.getPluginIds();
}
