import { executeAnyWorkspaceTool, workspaceToolDeclarations } from '../lib/workspaceTools';
import { executeGoogleAgentTool, googleAgentToolDeclarations, GOOGLE_AGENT_TOOL_NAMES } from '../lib/googleAgentTools';
import { executeGoogleOperationalTool, googleOperationalToolDeclarations, GOOGLE_OPERATIONAL_TOOL_NAMES } from '../lib/googleAgentOperationalTools';
import { executeGoogleAuthLifecycleTool, GOOGLE_AUTH_LIFECYCLE_TOOL_DECLARATION } from '../lib/googleAuthLifecycleTool';
import { authorizeGoogleAction, classifyGoogleAction } from '../lib/googleAuthorizationPolicy';
import { markGoogleAuthInvalid } from '../lib/googleAuthLifecycle';
import { ToolPluginRegistry } from './toolPluginRegistry';
import { artifactToolPlugin } from './artifactToolPlugin';
import type { ToolPlugin, AgentToolDeclaration, ToolExecutionContext } from './toolPluginTypes';

const ARTIFACT_TOOL_NAMES = new Set([
  'create_artifact',
  'read_artifact',
  'update_artifact',
  'list_artifacts',
  'rename_artifact',
]);

const GOOGLE_BACKED_WORKSPACE_WRITE_TOOLS = new Set([
  'create_google_doc',
  'update_google_doc',
  'link_google_doc',
  'sync_to_google_doc',
  'sync_from_google_doc',
]);

function withExternalActionConfirmation(tool: AgentToolDeclaration): AgentToolDeclaration {
  const actionClass = classifyGoogleAction(tool.name);
  if (actionClass === 'read') return tool;

  const parameters = (tool.parameters || { type: 'OBJECT', properties: {} }) as Record<string, any>;
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

function withGoogleExposureMetadata(tool: AgentToolDeclaration, forceAuth = false): AgentToolDeclaration {
  const actionClass = classifyGoogleAction(tool.name);
  if (forceAuth) return { ...tool, capabilities: ['google.auth'], effects: ['auth-change'] };

  if (actionClass === 'read') {
    return {
      ...tool,
      capabilities: Array.from(new Set([...(tool.capabilities || []), 'google.read'])),
      effects: Array.from(new Set([...(tool.effects || []), 'read'])),
    };
  }

  return {
    ...tool,
    capabilities: Array.from(new Set([...(tool.capabilities || []), 'google.write'])),
    effects: Array.from(new Set([...(tool.effects || []), actionClass === 'destructive' ? 'auth-change' : 'external-write'])),
  };
}

function externalConfirmationForWorkspace(tool: AgentToolDeclaration): AgentToolDeclaration {
  const confirmed = GOOGLE_BACKED_WORKSPACE_WRITE_TOOLS.has(tool.name) ? withExternalActionConfirmation(tool) : tool;
  return tool.name.includes('google') ? withGoogleExposureMetadata(confirmed) : confirmed;
}

function googleAuthorization(context: ToolExecutionContext) {
  const authorization = authorizeGoogleAction(context.toolName, context.args, context.googleToken || 'session');
  return authorization.allowed ? { allowed: true as const } : { allowed: false as const, result: authorization };
}

const workspacePlugin: ToolPlugin = {
  id: 'workspace',
  version: 1,
  declarations: workspaceToolDeclarations.filter((tool) => !ARTIFACT_TOOL_NAMES.has(tool.name)).map(externalConfirmationForWorkspace),
  owns: (toolName) => workspaceToolDeclarations.some((tool) => tool.name === toolName) && !ARTIFACT_TOOL_NAMES.has(toolName),
  authorize: (context) => GOOGLE_BACKED_WORKSPACE_WRITE_TOOLS.has(context.toolName) ? googleAuthorization(context) : { allowed: true },
  execute: async ({ workspace, toolName, args, googleToken }) => {
    const operation = await executeAnyWorkspaceTool(workspace, toolName, args, googleToken);
    if (operation.result?.errorCode === 'GOOGLE_AUTH_REQUIRED') markGoogleAuthInvalid();
    return operation;
  },
};

const googleAgentPlugin: ToolPlugin = {
  id: 'google-agent',
  version: 1,
  declarations: googleAgentToolDeclarations.map((tool) => withGoogleExposureMetadata(withExternalActionConfirmation(tool))),
  owns: (toolName) => GOOGLE_AGENT_TOOL_NAMES.has(toolName),
  authorize: googleAuthorization,
  execute: async ({ toolName, args, googleToken, workspace }) => {
    const result = await executeGoogleAgentTool(toolName, args, googleToken);
    if (result?.errorCode === 'GOOGLE_AUTH_REQUIRED') markGoogleAuthInvalid();
    return { result, updatedWorkspace: workspace };
  },
};

const googleOperationalPlugin: ToolPlugin = {
  id: 'google-operational',
  version: 1,
  declarations: googleOperationalToolDeclarations.map((tool) => withGoogleExposureMetadata(withExternalActionConfirmation(tool))),
  owns: (toolName) => GOOGLE_OPERATIONAL_TOOL_NAMES.has(toolName),
  authorize: googleAuthorization,
  execute: async ({ toolName, args, googleToken, workspace }) => {
    const result = await executeGoogleOperationalTool(toolName, args, googleToken);
    if (result?.errorCode === 'GOOGLE_AUTH_REQUIRED') markGoogleAuthInvalid();
    return { result, updatedWorkspace: workspace };
  },
};

const googleAuthLifecyclePlugin: ToolPlugin = {
  id: 'google-auth-lifecycle',
  version: 1,
  declarations: [withGoogleExposureMetadata(withExternalActionConfirmation(GOOGLE_AUTH_LIFECYCLE_TOOL_DECLARATION), true)],
  owns: (toolName) => toolName === GOOGLE_AUTH_LIFECYCLE_TOOL_DECLARATION.name,
  authorize: googleAuthorization,
  execute: async ({ toolName, args, workspace }) => ({
    result: await executeGoogleAuthLifecycleTool(toolName, args),
    updatedWorkspace: workspace,
  }),
};

export const builtinToolPlugins: readonly ToolPlugin[] = [
  artifactToolPlugin,
  workspacePlugin,
  googleAgentPlugin,
  googleOperationalPlugin,
  googleAuthLifecyclePlugin,
];

export function createBuiltinToolPluginRegistry() {
  const registry = new ToolPluginRegistry();
  registry.registerAll(builtinToolPlugins);
  return registry;
}
