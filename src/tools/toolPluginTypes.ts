import type { AgentToolExecution } from '../lib/agentToolRegistry';

export interface AgentToolDeclaration {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ToolExecutionContext {
  workspace: import('../types').Workspace;
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
  execute(context: ToolExecutionContext): Promise<AgentToolExecution>;
}
