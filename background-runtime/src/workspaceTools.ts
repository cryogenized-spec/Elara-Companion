import { createArtifact, generateCanvas, listArtifacts, normalizeWorkspace, readArtifact, renameArtifact, updateArtifact } from './workspaceToolOperations';
import { durableWorkspaceTools } from './workspaceToolDefinitions';
import type { DurableWorkspace, DurableWorkspaceToolResult } from './workspaceToolTypes';

export type { DurableWorkspace, DurableWorkspaceToolResult } from './workspaceToolTypes';
export { durableWorkspaceTools } from './workspaceToolDefinitions';

export function executeDurableWorkspaceTool(
  workspaceInput: Partial<DurableWorkspace> | undefined,
  toolName: string,
  args: any,
): DurableWorkspaceToolResult {
  const workspace = normalizeWorkspace(workspaceInput);
  const safeArgs = args && typeof args === 'object' ? args : {};
  switch (toolName) {
    case 'create_artifact': return createArtifact(workspace, safeArgs);
    case 'read_artifact': return readArtifact(workspace, safeArgs);
    case 'update_artifact': return updateArtifact(workspace, safeArgs);
    case 'list_artifacts': return listArtifacts(workspace, safeArgs);
    case 'rename_artifact': return renameArtifact(workspace, safeArgs);
    case 'generate_canvas': return generateCanvas(workspace, safeArgs);
    default: return { result: { success: false, error: `Unsupported durable tool: ${toolName}` }, updatedWorkspace: workspace };
  }
}
