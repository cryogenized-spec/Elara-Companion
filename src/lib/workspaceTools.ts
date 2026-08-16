import { Workspace, WorkspaceArtifact } from '../types';

export const workspaceToolDeclarations = [
  {
    name: 'create_artifact',
    description:
      'Create a new persistent document in the Workspace. Use this tool when the user asks to create, draft, write, or generate a new document, SOP, guide, script, plan, checklist, or template. Supported types: "markdown", "text".',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: {
          type: 'STRING',
          description: 'The title or filename of the document to create (e.g. "Warehouse Receiving SOP").',
        },
        type: {
          type: 'STRING',
          description: 'The document format: "markdown" or "text". Defaults to "markdown".',
        },
        content: {
          type: 'STRING',
          description: 'The complete structured content of the document.',
        },
      },
      required: ['name', 'content'],
    },
  },
  {
    name: 'read_artifact',
    description:
      'Retrieve the current content, name, and metadata of an existing Workspace document by its artifactId. Use this tool before modifying a document or to inspect document contents.',
    parameters: {
      type: 'OBJECT',
      properties: {
        artifactId: {
          type: 'STRING',
          description: 'The unique ID of the document to read.',
        },
      },
      required: ['artifactId'],
    },
  },
  {
    name: 'update_artifact',
    description:
      'Update the content of an existing Workspace document. Use this tool when the user asks to add sections, edit, modify, append to, or revise an existing document. Do NOT call create_artifact when modifying an existing document.',
    parameters: {
      type: 'OBJECT',
      properties: {
        artifactId: {
          type: 'STRING',
          description: 'The unique ID of the existing document to update.',
        },
        content: {
          type: 'STRING',
          description: 'The full updated content of the document including any new or modified sections.',
        },
      },
      required: ['artifactId', 'content'],
    },
  },
  {
    name: 'list_artifacts',
    description:
      'List all documents currently available in the Workspace, returning their artifactId, name, type, and updatedAt timestamp.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'rename_artifact',
    description: 'Rename an existing Workspace document without altering its ID or content.',
    parameters: {
      type: 'OBJECT',
      properties: {
        artifactId: {
          type: 'STRING',
          description: 'The unique ID of the document to rename.',
        },
        name: {
          type: 'STRING',
          description: 'The new title or name for the document.',
        },
      },
      required: ['artifactId', 'name'],
    },
  },
  {
    name: 'generate_canvas',
    description: 'Legacy tool to generate long-form content or interactive canvases in the workspace.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Title for the document/canvas.',
        },
        content: {
          type: 'STRING',
          description: 'The markdown content for the canvas.',
        },
      },
      required: ['title', 'content'],
    },
  },
];

export interface WorkspaceOperationResult {
  result: Record<string, any>;
  updatedWorkspace: Workspace;
  createdArtifactId?: string;
  modifiedArtifactId?: string;
}

export function executeWorkspaceOperation(
  workspace: Workspace,
  toolName: string,
  args: any
): WorkspaceOperationResult {
  const currentWs: Workspace = {
    id: workspace?.id || 'default-workspace',
    name: workspace?.name || 'My Workspace',
    artifacts: Array.isArray(workspace?.artifacts) ? [...workspace.artifacts] : [],
    activeArtifactId: workspace?.activeArtifactId || null,
  };

  const safeArgs = args && typeof args === 'object' ? args : {};

  switch (toolName) {
    case 'create_artifact': {
      const rawName = typeof safeArgs.name === 'string' ? safeArgs.name.trim() : '';
      if (!rawName) {
        return {
          result: { success: false, error: 'Document name is required and cannot be empty.' },
          updatedWorkspace: currentWs,
        };
      }

      const content = typeof safeArgs.content === 'string' ? safeArgs.content : String(safeArgs.content || '');
      const type = safeArgs.type === 'text' ? 'text' : 'markdown';
      const artifactId = `art_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const now = Date.now();

      const newArtifact: WorkspaceArtifact = {
        id: artifactId,
        name: rawName,
        content,
        type,
        createdAt: now,
        updatedAt: now,
      };

      const updatedWorkspace: Workspace = {
        ...currentWs,
        artifacts: [...currentWs.artifacts, newArtifact],
        activeArtifactId: artifactId,
      };

      return {
        result: {
          success: true,
          artifactId,
          name: newArtifact.name,
          type: newArtifact.type,
        },
        updatedWorkspace,
        createdArtifactId: artifactId,
        modifiedArtifactId: artifactId,
      };
    }

    case 'read_artifact': {
      const artifactId = typeof safeArgs.artifactId === 'string' ? safeArgs.artifactId.trim() : '';
      if (!artifactId) {
        return {
          result: { success: false, error: 'artifactId parameter is required.' },
          updatedWorkspace: currentWs,
        };
      }

      // Try exact ID match first, fallback to exact case-insensitive name match
      const artifact = currentWs.artifacts.find(
        (a) => a.id === artifactId || a.name.toLowerCase() === artifactId.toLowerCase()
      );

      if (!artifact) {
        return {
          result: { success: false, error: `Artifact not found with ID or name: "${artifactId}".` },
          updatedWorkspace: currentWs,
        };
      }

      return {
        result: {
          success: true,
          artifactId: artifact.id,
          name: artifact.name,
          type: artifact.type,
          content: artifact.content,
          updatedAt: artifact.updatedAt,
        },
        updatedWorkspace: currentWs,
      };
    }

    case 'update_artifact': {
      const artifactId = typeof safeArgs.artifactId === 'string' ? safeArgs.artifactId.trim() : '';
      if (!artifactId) {
        return {
          result: { success: false, error: 'artifactId parameter is required.' },
          updatedWorkspace: currentWs,
        };
      }

      if (typeof safeArgs.content !== 'string') {
        return {
          result: { success: false, error: 'content parameter is required.' },
          updatedWorkspace: currentWs,
        };
      }

      // Stale content protection: verify artifact exists
      const targetIndex = currentWs.artifacts.findIndex(
        (a) => a.id === artifactId || a.name.toLowerCase() === artifactId.toLowerCase()
      );

      if (targetIndex === -1) {
        return {
          result: {
            success: false,
            error: `Artifact with ID "${artifactId}" not found or no longer exists. Update aborted.`,
          },
          updatedWorkspace: currentWs,
        };
      }

      const existingArtifact = currentWs.artifacts[targetIndex];
      const now = Date.now();
      const updatedArtifact: WorkspaceArtifact = {
        ...existingArtifact,
        content: safeArgs.content,
        updatedAt: now,
      };

      const updatedArtifacts = [...currentWs.artifacts];
      updatedArtifacts[targetIndex] = updatedArtifact;

      const updatedWorkspace: Workspace = {
        ...currentWs,
        artifacts: updatedArtifacts,
        activeArtifactId: updatedArtifact.id,
      };

      return {
        result: {
          success: true,
          artifactId: updatedArtifact.id,
          updatedAt: updatedArtifact.updatedAt,
        },
        updatedWorkspace,
        modifiedArtifactId: updatedArtifact.id,
      };
    }

    case 'list_artifacts': {
      const summaryList = currentWs.artifacts.map((a) => ({
        artifactId: a.id,
        name: a.name,
        type: a.type,
        updatedAt: new Date(a.updatedAt).toISOString(),
      }));

      return {
        result: {
          success: true,
          artifacts: summaryList,
          count: summaryList.length,
        },
        updatedWorkspace: currentWs,
      };
    }

    case 'rename_artifact': {
      const artifactId = typeof safeArgs.artifactId === 'string' ? safeArgs.artifactId.trim() : '';
      const newName = typeof safeArgs.name === 'string' ? safeArgs.name.trim() : '';

      if (!artifactId) {
        return {
          result: { success: false, error: 'artifactId parameter is required.' },
          updatedWorkspace: currentWs,
        };
      }

      if (!newName) {
        return {
          result: { success: false, error: 'name parameter is required and cannot be empty.' },
          updatedWorkspace: currentWs,
        };
      }

      const targetIndex = currentWs.artifacts.findIndex(
        (a) => a.id === artifactId || a.name.toLowerCase() === artifactId.toLowerCase()
      );

      if (targetIndex === -1) {
        return {
          result: { success: false, error: `Artifact with ID "${artifactId}" not found.` },
          updatedWorkspace: currentWs,
        };
      }

      const existing = currentWs.artifacts[targetIndex];
      const now = Date.now();
      const renamed: WorkspaceArtifact = {
        ...existing,
        name: newName,
        updatedAt: now,
      };

      const updatedArtifacts = [...currentWs.artifacts];
      updatedArtifacts[targetIndex] = renamed;

      const updatedWorkspace: Workspace = {
        ...currentWs,
        artifacts: updatedArtifacts,
        activeArtifactId: renamed.id,
      };

      return {
        result: {
          success: true,
          artifactId: renamed.id,
          name: renamed.name,
          updatedAt: renamed.updatedAt,
        },
        updatedWorkspace,
        modifiedArtifactId: renamed.id,
      };
    }

    case 'generate_canvas': {
      // Legacy compatibility bridge
      const rawTitle = typeof safeArgs.title === 'string' ? safeArgs.title.trim() : 'Canvas Document';
      const content = typeof safeArgs.content === 'string' ? safeArgs.content : '';
      const artifactId = `art_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const now = Date.now();

      const newArtifact: WorkspaceArtifact = {
        id: artifactId,
        name: rawTitle,
        content,
        type: 'markdown',
        createdAt: now,
        updatedAt: now,
      };

      const updatedWorkspace: Workspace = {
        ...currentWs,
        artifacts: [...currentWs.artifacts, newArtifact],
        activeArtifactId: artifactId,
      };

      return {
        result: {
          success: true,
          artifactId,
          name: newArtifact.name,
          type: 'markdown',
        },
        updatedWorkspace,
        createdArtifactId: artifactId,
        modifiedArtifactId: artifactId,
      };
    }

    default:
      return {
        result: { success: false, error: `Unknown tool: ${toolName}` },
        updatedWorkspace: currentWs,
      };
  }
}

export function buildWorkspaceContextPrompt(workspace?: Workspace | null): string {
  if (!workspace || !Array.isArray(workspace.artifacts) || workspace.artifacts.length === 0) {
    return `\n[WORKSPACE STATUS]\nThe user's Workspace is currently empty. You can use create_artifact to create new persistent documents for the user.\n`;
  }

  const active = workspace.activeArtifactId
    ? workspace.artifacts.find((a) => a.id === workspace.activeArtifactId)
    : null;

  let prompt = `\n[CURRENT WORKSPACE STATE]\n`;
  if (active) {
    prompt += `Active Document Currently Open in Workspace:\n- Title: "${active.name}" (ID: ${active.id}, Type: ${active.type}, Last updated: ${new Date(active.updatedAt).toISOString()})\n`;
  } else {
    prompt += `No document is currently active.\n`;
  }

  prompt += `\nAll Available Documents in Workspace (${workspace.artifacts.length}):\n`;
  for (const art of workspace.artifacts) {
    prompt += `- "${art.name}" (ID: ${art.id}, Type: ${art.type})\n`;
  }

  prompt += `\nInstructions for Workspace Tools:
1. To create a new document/SOP/guide, call create_artifact.
2. To add to, edit, or modify an existing document, first read it via read_artifact if needed, then call update_artifact with the complete modified document content. Never call create_artifact to modify an existing document.
3. When the user says "this document", "the document", or refers to an open document, prioritize the Active Document.
4. When ambiguous between similarly named documents and the target cannot be determined, call list_artifacts or ask the user for clarification rather than guessing.
5. To rename a document, call rename_artifact.
`;

  return prompt;
}
