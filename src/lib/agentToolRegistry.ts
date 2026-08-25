import { getGoogleRuntimeStatus } from './googleRuntime';
import { createBuiltinToolPluginRegistry } from '../tools/builtinToolPlugins';
import type { ToolExecutionResult, ToolInvocationSource } from '../tools/toolPluginTypes';
import type { Workspace } from '../types';
import type { ToolExposurePolicy } from '../security/toolExposurePolicy';

const toolRegistry = createBuiltinToolPluginRegistry();

export const agentToolDeclarations = toolRegistry.getDeclarations();
export type AgentToolExecution = ToolExecutionResult;

export function getAgentConnectionContext(): string {
  return getGoogleRuntimeStatus().hint;
}

export function getAgentToolDeclarations(policy?: ToolExposurePolicy) {
  return toolRegistry.getDeclarations(policy);
}

export async function executeAgentTool(
  workspace: Workspace,
  toolName: string,
  args: any,
  googleToken?: string,
  source: ToolInvocationSource = 'model',
): Promise<AgentToolExecution> {
  return toolRegistry.execute({
    workspace,
    toolName,
    args: args && typeof args === 'object' ? args : {},
    googleToken,
    source,
  });
}

export function getRegisteredAgentToolPluginIds(): string[] {
  return toolRegistry.getPluginIds();
}
