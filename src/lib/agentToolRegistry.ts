import { workspaceToolDeclarations, executeAnyWorkspaceTool } from './workspaceTools';
import { googleAgentToolDeclarations, GOOGLE_AGENT_TOOL_NAMES, executeGoogleAgentTool } from './googleAgentTools';
import { googleOperationalToolDeclarations, GOOGLE_OPERATIONAL_TOOL_NAMES, executeGoogleOperationalTool } from './googleAgentOperationalTools';
import { getGoogleRuntimeStatus } from './googleRuntime';
import { authorizeGoogleAction, classifyGoogleAction } from './googleAuthorizationPolicy';
import { Workspace } from '../types';

const googleDeclarations = [
  ...googleAgentToolDeclarations,
  ...googleOperationalToolDeclarations,
];

function withExternalActionConfirmation(tool: any) {
  const actionClass = classifyGoogleAction(tool.name);
  if (actionClass === 'read') return tool;

  const parameters = tool.parameters || { type: 'OBJECT', properties: {} };
  const properties = { ...(parameters.properties || {}) };
  properties.userConfirmed = {
    type: 'BOOLEAN',
    description: 'Must be true only when the user has explicitly confirmed this external Google write/delete operation.',
  };

  const required = Array.from(new Set([...(parameters.required || []), 'userConfirmed']));
  return {
    ...tool,
    description: `${tool.description || ''} Explicit user confirmation is required before this operation changes Google data.`,
    parameters: { ...parameters, properties, required },
  };
}

export const agentToolDeclarations = [
  ...workspaceToolDeclarations,
  ...googleDeclarations.map(withExternalActionConfirmation),
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
  if (GOOGLE_AGENT_TOOL_NAMES.has(toolName) || GOOGLE_OPERATIONAL_TOOL_NAMES.has(toolName)) {
    const authorization = authorizeGoogleAction(toolName, args, googleToken);
    if (!authorization.allowed) {
      return {
        result: authorization,
        updatedWorkspace: workspace,
      };
    }
  }

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