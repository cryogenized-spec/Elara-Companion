import { workspaceToolDeclarations, executeAnyWorkspaceTool } from './workspaceTools';
import { googleAgentToolDeclarations, GOOGLE_AGENT_TOOL_NAMES, executeGoogleAgentTool } from './googleAgentTools';
import { googleOperationalToolDeclarations, GOOGLE_OPERATIONAL_TOOL_NAMES, executeGoogleOperationalTool } from './googleAgentOperationalTools';
import { GOOGLE_AUTH_LIFECYCLE_TOOL_DECLARATION, executeGoogleAuthLifecycleTool } from './googleAuthLifecycleTool';
import { getGoogleRuntimeStatus } from './googleRuntime';
import { markGoogleAuthInvalid } from './googleAuthLifecycle';
import { authorizeGoogleAction, classifyGoogleAction } from './googleAuthorizationPolicy';
import { Workspace } from '../types';

const googleDeclarations = [
  ...googleAgentToolDeclarations,
  ...googleOperationalToolDeclarations,
  GOOGLE_AUTH_LIFECYCLE_TOOL_DECLARATION,
];

function withExternalActionConfirmation(tool: any) {
  const actionClass = classifyGoogleAction(tool.name);
  if (actionClass === 'read') return tool;

  const parameters = tool.parameters || { type: 'OBJECT', properties: {} };
  const properties = { ...(parameters.properties || {}) };
  properties.userConfirmed = {
    type: 'BOOLEAN',
    description: 'Must be true only when the user has explicitly confirmed this external Google write/delete/revoke operation.',
  };

  const required = Array.from(new Set([...(parameters.required || []), 'userConfirmed']));
  return {
    ...tool,
    description: `${tool.description || ''} Explicit user confirmation is required before this operation changes Google data or authentication state.`,
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
  const isGoogleTool =
    GOOGLE_AGENT_TOOL_NAMES.has(toolName) ||
    GOOGLE_OPERATIONAL_TOOL_NAMES.has(toolName) ||
    toolName === GOOGLE_AUTH_LIFECYCLE_TOOL_DECLARATION.name;

  if (isGoogleTool) {
    const authorization = authorizeGoogleAction(toolName, args, googleToken || 'session');
    if (!authorization.allowed) {
      return {
        result: authorization,
        updatedWorkspace: workspace,
      };
    }
  }

  if (toolName === GOOGLE_AUTH_LIFECYCLE_TOOL_DECLARATION.name) {
    return {
      result: await executeGoogleAuthLifecycleTool(toolName, args),
      updatedWorkspace: workspace,
    };
  }

  if (GOOGLE_AGENT_TOOL_NAMES.has(toolName)) {
    const result = await executeGoogleAgentTool(toolName, args, googleToken);
    if (result?.errorCode === 'GOOGLE_AUTH_REQUIRED') markGoogleAuthInvalid();
    return { result, updatedWorkspace: workspace };
  }

  if (GOOGLE_OPERATIONAL_TOOL_NAMES.has(toolName)) {
    const result = await executeGoogleOperationalTool(toolName, args, googleToken);
    if (result?.errorCode === 'GOOGLE_AUTH_REQUIRED') markGoogleAuthInvalid();
    return { result, updatedWorkspace: workspace };
  }

  const operation = await executeAnyWorkspaceTool(workspace, toolName, args, googleToken);
  if (operation.result?.errorCode === 'GOOGLE_AUTH_REQUIRED') markGoogleAuthInvalid();
  return {
    result: operation.result,
    updatedWorkspace: operation.updatedWorkspace,
    createdArtifactId: operation.createdArtifactId,
    modifiedArtifactId: operation.modifiedArtifactId,
    externalDocUrl: operation.externalDocUrl,
  };
}