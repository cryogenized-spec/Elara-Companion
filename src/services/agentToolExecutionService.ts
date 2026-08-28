import { executeAgentTool, type AgentToolExecution } from '../lib/agentToolRegistry';
import { publishApplicationEvent } from '../events/applicationEventBus';
import { recordLiveToolActivity } from '../lib/thinkingLiveRuntime';
import { googleActivityRecorder, recordGoogleToolActivity } from './googleActivityService';
import type { Workspace } from '../types';

export async function executeAgentToolCall(
  workspace: Workspace,
  toolName: string,
  args: any,
  googleToken?: string,
  source: 'model' | 'user' | 'background' | 'automation' | 'system' = 'model',
): Promise<AgentToolExecution> {
  const execution = await executeAgentTool(workspace, toolName, args, googleToken, source);

  if (typeof window !== 'undefined') {
    recordLiveToolActivity({
      name: toolName,
      args,
      result: execution.result,
    });
  }

  recordGoogleToolActivity(googleActivityRecorder, toolName, execution.result);

  if (execution.createdArtifactId) {
    const artifact = execution.updatedWorkspace.artifacts.find((item) => item.id === execution.createdArtifactId);
    if (artifact) {
      publishApplicationEvent({
        type: 'artifact.changed',
        payload: { artifact, action: 'created' },
      });
    }
  }

  return execution;
}

export function mergeTouchedArtifactIds(current: string[], execution: AgentToolExecution): string[] {
  return Array.from(new Set([
    ...current,
    ...(execution.createdArtifactId ? [execution.createdArtifactId] : []),
    ...(execution.modifiedArtifactId ? [execution.modifiedArtifactId] : []),
  ]));
}
