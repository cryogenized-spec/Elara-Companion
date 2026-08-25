import type { Workspace } from '../types';

export type ToolInvocationSource = 'model' | 'user' | 'background' | 'automation' | 'system';
export type ToolCapability = 'workspace.read' | 'workspace.write' | 'google.read' | 'google.write' | 'google.auth' | 'memory.read' | 'memory.write';
export type ToolEffect = 'read' | 'write' | 'external-write' | 'auth-change';

/** JSON-schema-like tool parameter metadata owned by the model/tool boundary. */
export type ToolParameterSchema = Record<string, any>;

export interface AgentToolDeclaration {
  name: string;
  description?: string;
  parameters?: ToolParameterSchema;
  capabilities?: readonly ToolCapability[];
  effects?: readonly ToolEffect[];
  [key: string]: unknown;
}

export interface ToolExecutionResult {
  result: any;
  updatedWorkspace: Workspace;
  createdArtifactId?: string;
  modifiedArtifactId?: string;
  externalDocUrl?: string;
}

export interface ToolExecutionContext {
  workspace: Workspace;
  toolName: string;
  args: Record<string, unknown>;
  googleToken?: string;
  invocationId: string;
  source: ToolInvocationSource;
  pluginId: string;
  capabilities: readonly ToolCapability[];
  effects: readonly ToolEffect[];
}

export interface ToolPlugin {
  id: string;
  version: 1;
  declarations: readonly AgentToolDeclaration[];
  owns(toolName: string): boolean;
  authorize?(context: ToolExecutionContext): { allowed: true } | { allowed: false; result: unknown } | Promise<{ allowed: true } | { allowed: false; result: unknown }>;
  execute(context: ToolExecutionContext): Promise<ToolExecutionResult>;
}
