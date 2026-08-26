export type DurableWorkspace = {
  id: string;
  name: string;
  activeArtifactId: string | null;
  artifacts: Array<{
    id: string;
    name: string;
    content: string;
    type: string;
    provider?: string;
    createdAt: number;
    updatedAt: number;
    revisions?: Array<{
      id: string;
      revisionNumber: number;
      content: string;
      createdAt: number;
      author: 'agent';
    }>;
  }>;
};

export type DurableWorkspaceToolResult = {
  result: unknown;
  updatedWorkspace: DurableWorkspace;
  createdArtifactId?: string;
  modifiedArtifactId?: string;
};
