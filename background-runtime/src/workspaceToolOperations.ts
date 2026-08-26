import type { DurableWorkspace, DurableWorkspaceToolResult } from './workspaceToolTypes';

const now = () => Date.now();
const id = (prefix: string) => `${prefix}_${now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function normalizeWorkspace(workspace?: Partial<DurableWorkspace>): DurableWorkspace {
  return {
    id: workspace?.id || 'default-workspace',
    name: workspace?.name || 'My Workspace',
    activeArtifactId: workspace?.activeArtifactId || null,
    artifacts: Array.isArray(workspace?.artifacts) ? workspace.artifacts.map((artifact) => ({ ...artifact })) : [],
  };
}

function revision(artifact: DurableWorkspace['artifacts'][number], content: string) {
  return [
    ...(artifact.revisions || []),
    { id: id('rev'), revisionNumber: (artifact.revisions?.length || 0) + 1, content, createdAt: now(), author: 'agent' as const },
  ];
}

function result(
  payload: unknown,
  updatedWorkspace: DurableWorkspace,
  extra: Pick<DurableWorkspaceToolResult, 'createdArtifactId' | 'modifiedArtifactId'> = {},
): DurableWorkspaceToolResult {
  return { result: payload, updatedWorkspace, ...extra };
}

export function createArtifact(workspace: DurableWorkspace, args: Record<string, any>): DurableWorkspaceToolResult {
  const name = typeof args.name === 'string' ? args.name.trim() : '';
  if (!name) return result({ success: false, error: 'A document name is required.' }, workspace);
  const content = typeof args.content === 'string' ? args.content : String(args.content || '');
  const artifactId = id('art');
  const artifact: DurableWorkspace['artifacts'][number] = {
    id: artifactId,
    name,
    content,
    type: args.type === 'text' ? 'text' : 'markdown',
    provider: 'local',
    createdAt: now(),
    updatedAt: now(),
  };
  artifact.revisions = revision(artifact, content);
  return result(
    { success: true, artifactId, name, type: artifact.type },
    { ...workspace, artifacts: [...workspace.artifacts, artifact], activeArtifactId: artifactId },
    { createdArtifactId: artifactId },
  );
}

export function readArtifact(workspace: DurableWorkspace, args: Record<string, any>): DurableWorkspaceToolResult {
  const artifact = workspace.artifacts.find((item) => item.id === args.artifactId);
  if (!artifact) return result({ success: false, error: `Artifact ${args.artifactId || '(missing)'} was not found.` }, workspace);
  return result({ success: true, artifact }, workspace);
}

export function updateArtifact(workspace: DurableWorkspace, args: Record<string, any>): DurableWorkspaceToolResult {
  const index = workspace.artifacts.findIndex((item) => item.id === args.artifactId);
  if (index < 0) return result({ success: false, error: `Artifact ${args.artifactId || '(missing)'} was not found.` }, workspace);
  const content = typeof args.content === 'string' ? args.content : String(args.content || '');
  const artifact: DurableWorkspace['artifacts'][number] = { ...workspace.artifacts[index], content, updatedAt: now() };
  artifact.revisions = revision(artifact, content);
  const artifacts = [...workspace.artifacts];
  artifacts[index] = artifact;
  return result(
    { success: true, artifactId: artifact.id, name: artifact.name, updatedAt: artifact.updatedAt },
    { ...workspace, artifacts, activeArtifactId: artifact.id },
    { modifiedArtifactId: artifact.id },
  );
}

export function listArtifacts(workspace: DurableWorkspace, _args: Record<string, any>): DurableWorkspaceToolResult {
  return result({ success: true, artifacts: workspace.artifacts.map((artifact) => ({ artifactId: artifact.id, name: artifact.name, type: artifact.type, provider: artifact.provider || 'local', updatedAt: artifact.updatedAt })) }, workspace);
}

export function renameArtifact(workspace: DurableWorkspace, args: Record<string, any>): DurableWorkspaceToolResult {
  const index = workspace.artifacts.findIndex((item) => item.id === args.artifactId);
  if (index < 0) return result({ success: false, error: `Artifact ${args.artifactId || '(missing)'} was not found.` }, workspace);
  const name = typeof args.name === 'string' ? args.name.trim() : '';
  if (!name) return result({ success: false, error: 'A new artifact name is required.' }, workspace);
  const artifacts = [...workspace.artifacts];
  artifacts[index] = { ...artifacts[index], name, updatedAt: now() };
  return result(
    { success: true, artifactId: artifacts[index].id, name },
    { ...workspace, artifacts },
    { modifiedArtifactId: artifacts[index].id },
  );
}

export function generateCanvas(workspace: DurableWorkspace, args: Record<string, any>): DurableWorkspaceToolResult {
  const name = typeof args.title === 'string' && args.title.trim() ? args.title.trim() : 'Canvas';
  return createArtifact(workspace, { name, type: 'markdown', content: typeof args.content === 'string' ? args.content : String(args.content || '') });
}
