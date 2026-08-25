import type { Workspace } from '../types';

export interface AgentToolDeclaration {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
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
}

export interface ToolPlugin {
  id: string;
  version: 1;
  declarations: readonly AgentToolDeclaration[];
  owns(toolName: string): boolean;
  authorize?(context: ToolExecutionContext): { allowed: true } | { allowed: false; result: unknown } | Promise<{ allowed: true } | { allowed: false; result: unknown }>;
  execute(context: ToolExecutionContext): Promise<ToolExecutionResult>;
}
