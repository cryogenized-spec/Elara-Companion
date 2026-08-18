import { Workspace } from '../types';
import { workspaceToolDeclarations, executeAnyWorkspaceTool } from './workspaceTools';
import { googleAgentToolDeclarations, GOOGLE_AGENT_TOOL_NAMES, executeGoogleAgentTool } from './googleAgentTools';
import { googleOperationalToolDeclarations, GOOGLE_OPERATIONAL_TOOL_NAMES, executeGoogleOperationalTool } from './googleAgentOperationalTools';
import { getGoogleRuntimeStatus } from './googleRuntime';

export const agentToolDeclarations = [
  ...workspaceToolDeclarations,
  ...googleAgentToolDeclarations,
  ...googleOperationalToolDeclarations,
];

export type AgentToolExecution = {
  result: any;
  updatedWorkspace: Workspace;
  createdArtifactId?: string;
  modifiedArtifactId?: string;
  externalDocUrl?: string;
};

export function getAgentConnectionContext(): string {
  return getGoogleRuntimeStatus().hint;
}

export async function executeAgentTool(
  workspace: Workspace,
  toolName: string,
  args: any,
  googleToken?: string,
): Promise<AgentToolExecution> {
  if (GOOGLE_AGENT_TOOL_NAMES.has(toolName)) {
    return {
      result: await executeGoogleAgentTool(toolName, args, googleToken),
      updatedWorkspace: workspace,
    };
  }

  if (GOOGLE_OPERATIONAL_TOOL_NAMES.has(toolName)) {
    return {
      result: await executeGoogleOperationalTool(toolName, args, googleToken),
      updatedWorkspace: workspace,
    };
  }

  const operation = await executeAnyWorkspaceTool(workspace, toolName, args, googleToken);
  return {
    result: operation.result,
    updatedWorkspace: operation.updatedWorkspace,
    createdArtifactId: operation.createdArtifactId,
    modifiedArtifactId: operation.modifiedArtifactId,
    externalDocUrl: operation.externalDocUrl,
  };
}
