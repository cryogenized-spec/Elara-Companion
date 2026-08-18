import { Workspace, WorkspaceArtifact } from '../types';
import { compareSyncState, computeLineDiff, hashString } from './syncUtils';
import { createRevisionForArtifact } from './revisionUtils';
import {
  createGoogleDoc,
  getGoogleDoc,
  editGoogleDoc,
  listGoogleDriveFiles,
  searchGoogleDriveFiles,
  readGoogleDriveFile,
  createKeepNote,
  getKeepNote,
  updateKeepNote,
  isGoogleConnected,
} from './googleApi';

export const workspaceToolDeclarations = [
  // ==========================================
  // 1. LOCAL WORKSPACE TOOLS (Canonical Documents)
  // ==========================================
  {
    name: 'create_artifact',
    description:
      'Create a new persistent document in the user\'s local Workspace. Use this tool when the user asks to create, draft, write, or generate a new document, SOP, guide, script, plan, checklist, or template. Supported types: "markdown", "text".',
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
      'Update the content of an existing local Workspace document. Use this tool when the user asks to add sections, edit, modify, append to, or revise an existing document. Do NOT call create_artifact when modifying an existing document.',
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
      'List all documents currently available in the local Workspace, returning their artifactId, name, type, provider, and updatedAt timestamp.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'rename_artifact',
    description: 'Rename an existing local Workspace document without altering its ID or content.',
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

  // ==========================================
  // 2. GOOGLE DRIVE TOOLS (External Cloud Storage)
  // ==========================================
  {
    name: 'list_google_drive_files',
    description:
      'List recent files and documents located in the user\'s Google Drive account.',
    parameters: {
      type: 'OBJECT',
      properties: {
        pageSize: {
          type: 'INTEGER',
          description: 'Maximum number of files to return (defaults to 10).',
        },
        query: {
          type: 'STRING',
          description: 'Optional filter query string for file names.',
        },
      },
    },
  },
  {
    name: 'search_google_drive',
    description:
      'Search for files or documents in the user\'s Google Drive matching a keyword, title, or query.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'The search query or keyword to find in Google Drive.',
        },
        pageSize: {
          type: 'INTEGER',
          description: 'Maximum number of results to return (defaults to 10).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_google_drive_file',
    description:
      'Read metadata and text content from a Google Drive file or document by its fileId.',
    parameters: {
      type: 'OBJECT',
      properties: {
        fileId: {
          type: 'STRING',
          description: 'The Google Drive file ID to read.',
        },
      },
      required: ['fileId'],
    },
  },

  // ==========================================
  // 3. GOOGLE DOCS TOOLS (External Google Documents)
  // ==========================================
  {
    name: 'create_google_doc',
    description:
      'Create a new Google Document in the user\'s Google Drive / Google Docs. Use this when the user explicitly asks to create a Google Doc or export content to Google Docs.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'The title of the new Google Doc.',
        },
        content: {
          type: 'STRING',
          description: 'The text or markdown content for the new Google Doc.',
        },
        associateWithArtifactId: {
          type: 'STRING',
          description: 'Optional local Workspace artifactId to link with this external Google Doc.',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'read_google_doc',
    description:
      'Retrieve the title, full text content, and URL of an existing Google Document by its documentId.',
    parameters: {
      type: 'OBJECT',
      properties: {
        documentId: {
          type: 'STRING',
          description: 'The unique Google Docs documentId.',
        },
      },
      required: ['documentId'],
    },
  },
  {
    name: 'update_google_doc',
    description:
      'Update or append text content to an existing Google Document. Modes: "append" (default), "replace", "prepend".',
    parameters: {
      type: 'OBJECT',
      properties: {
        documentId: {
          type: 'STRING',
          description: 'The unique Google Docs documentId.',
        },
        content: {
          type: 'STRING',
          description: 'The text to append, prepend, or replace in the Google Doc.',
        },
        mode: {
          type: 'STRING',
          description: 'Edit mode: "append", "replace", or "prepend". Defaults to "append".',
        },
      },
      required: ['documentId', 'content'],
    },
  },

  // ==========================================
  // 4. QUICK REFERENCE ARCHIVE TOOLS (Legacy Keep)
  // ==========================================
  {
    name: 'create_keep_note',
    description:
      'Create a quick reference note in the user\'s local reference archive (with optional Google Docs mirror). Note: This does not synchronize with the official Google Keep product.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'The title of the quick note.',
        },
        content: {
          type: 'STRING',
          description: 'The body content of the note.',
        },
        tags: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Optional categorization tags (e.g. ["urgent", "idea"]).',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'read_keep_note',
    description:
      'Read a note from the local reference archive by its ID or title.',
    parameters: {
      type: 'OBJECT',
      properties: {
        noteId: {
          type: 'STRING',
          description: 'The ID or title of the note to read.',
        },
      },
      required: ['noteId'],
    },
  },
  {
    name: 'update_keep_note',
    description:
      'Update an existing note in the local reference archive.',
    parameters: {
      type: 'OBJECT',
      properties: {
        noteId: {
          type: 'STRING',
          description: 'The ID of the note to update.',
        },
        title: {
          type: 'STRING',
          description: 'Optional updated title.',
        },
        content: {
          type: 'STRING',
          description: 'Optional updated content.',
        },
        tags: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Optional updated tags.',
        },
      },
      required: ['noteId'],
    },
  },

  // ==========================================
  // 5. SYNCHRONIZATION TOOLS
  // ==========================================
  {
    name: 'link_google_doc',
    description: 'Link a local Workspace document to an existing Google Doc. Establishes the relationship. You MUST specify an initialSyncMode to resolve any initial differences safely.',
    parameters: {
      type: 'OBJECT',
      properties: {
        artifactId: { type: 'STRING', description: 'The local Workspace document ID.' },
        documentId: { type: 'STRING', description: 'The Google Doc ID or URL.' },
        initialSyncMode: { type: 'STRING', description: 'Must be one of: "local_to_google" (overwrite Google Doc), "google_to_local" (overwrite local), or "compare_only" (do not overwrite either).' }
      },
      required: ['artifactId', 'documentId', 'initialSyncMode']
    }
  },
  {
    name: 'refresh_google_doc',
    description: 'Refresh the synchronization state of a linked document by inspecting the Google Doc and returning the comparison status.',
    parameters: {
      type: 'OBJECT',
      properties: {
        artifactId: { type: 'STRING', description: 'The local Workspace document ID to refresh.' }
      },
      required: ['artifactId']
    }
  },
  {
    name: 'sync_to_google_doc',
    description: 'Push the local Workspace document content to Google Docs. IMPORTANT: If there is a conflict, this will return an error and requiresResolution: true. You MUST NOT use force=true unless the user explicitly told you to "Keep Local" or "Overwrite Google".',
    parameters: {
      type: 'OBJECT',
      properties: {
        artifactId: { type: 'STRING', description: 'The local Workspace document ID to sync.' },
        force: { type: 'BOOLEAN', description: 'Force overwrite remote changes if conflict exists. Only use if user explicitly asked.' }
      },
      required: ['artifactId']
    }
  },
  {
    name: 'sync_from_google_doc',
    description: 'Pull the Google Doc content into the local Workspace document. IMPORTANT: If there is a conflict, this will return an error and requiresResolution: true. You MUST NOT use force=true unless the user explicitly told you to "Keep Google" or "Overwrite Local".',
    parameters: {
      type: 'OBJECT',
      properties: {
        artifactId: { type: 'STRING', description: 'The local Workspace document ID to update.' },
        force: { type: 'BOOLEAN', description: 'Force overwrite local changes if conflict exists. Only use if user explicitly asked.' }
      },
      required: ['artifactId']
    }
  },
  {
    name: 'compare_artifact_with_google_doc',
    description: 'Compare a local Workspace document with its linked Google Doc, returning differences.',
    parameters: {
      type: 'OBJECT',
      properties: {
        artifactId: { type: 'STRING', description: 'The local Workspace document ID to compare.' }
      },
      required: ['artifactId']
    }
  },

  // ==========================================
  // 6. LEGACY COMPATIBILITY BRIDGE
  // ==========================================
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
  externalDocUrl?: string;
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
          result: { success: false, provider: 'local', error: 'Document name is required and cannot be empty.' },
          updatedWorkspace: currentWs,
        };
      }

      const content = typeof safeArgs.content === 'string' ? safeArgs.content : String(safeArgs.content || '');
      const type = safeArgs.type === 'text' ? 'text' : 'markdown';
      const artifactId = `art_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const now = Date.now();

      let newArtifact: WorkspaceArtifact = {
        id: artifactId,
        name: rawName,
        content,
        type,
        provider: 'local',
        createdAt: now,
        updatedAt: now,
      };
      newArtifact = createRevisionForArtifact(newArtifact, 'agent', 'agent');

      const updatedWorkspace: Workspace = {
        ...currentWs,
        artifacts: [...currentWs.artifacts, newArtifact],
        activeArtifactId: artifactId,
      };

      return {
        result: {
          success: true,
          provider: 'local',
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
          result: { success: false, provider: 'local', error: 'artifactId parameter is required.' },
          updatedWorkspace: currentWs,
        };
      }

      const artifact = currentWs.artifacts.find(
        (a) => a.id === artifactId || a.name.toLowerCase() === artifactId.toLowerCase()
      );

      if (!artifact) {
        return {
          result: { success: false, provider: 'local', error: `Artifact not found with ID or name: "${artifactId}".` },
          updatedWorkspace: currentWs,
        };
      }

      return {
        result: {
          success: true,
          provider: artifact.provider || 'local',
          artifactId: artifact.id,
          name: artifact.name,
          type: artifact.type,
          content: artifact.content,
          url: artifact.url,
          externalId: artifact.externalId,
          updatedAt: artifact.updatedAt,
        },
        updatedWorkspace: currentWs,
      };
    }

    case 'update_artifact': {
      const artifactId = typeof safeArgs.artifactId === 'string' ? safeArgs.artifactId.trim() : '';
      if (!artifactId) {
        return {
          result: { success: false, provider: 'local', error: 'artifactId parameter is required.' },
          updatedWorkspace: currentWs,
        };
      }

      if (typeof safeArgs.content !== 'string') {
        return {
          result: { success: false, provider: 'local', error: 'content parameter is required.' },
          updatedWorkspace: currentWs,
        };
      }

      const targetIndex = currentWs.artifacts.findIndex(
        (a) => a.id === artifactId || a.name.toLowerCase() === artifactId.toLowerCase()
      );

      if (targetIndex === -1) {
        return {
          result: {
            success: false,
            provider: 'local',
            error: `Artifact with ID "${artifactId}" not found or no longer exists. Update aborted.`,
          },
          updatedWorkspace: currentWs,
        };
      }

      const existingArtifact = currentWs.artifacts[targetIndex];
      const now = Date.now();
      let updatedArtifact: WorkspaceArtifact = {
        ...existingArtifact,
        content: safeArgs.content,
        updatedAt: now,
      };
      updatedArtifact = createRevisionForArtifact(updatedArtifact, 'agent', 'agent');

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
          provider: updatedArtifact.provider || 'local',
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
        provider: a.provider || 'local',
        externalId: a.externalId,
        url: a.url,
        updatedAt: new Date(a.updatedAt).toISOString(),
      }));

      return {
        result: {
          success: true,
          provider: 'local',
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
          result: { success: false, provider: 'local', error: 'artifactId parameter is required.' },
          updatedWorkspace: currentWs,
        };
      }

      if (!newName) {
        return {
          result: { success: false, provider: 'local', error: 'name parameter is required and cannot be empty.' },
          updatedWorkspace: currentWs,
        };
      }

      const targetIndex = currentWs.artifacts.findIndex(
        (a) => a.id === artifactId || a.name.toLowerCase() === artifactId.toLowerCase()
      );

      if (targetIndex === -1) {
        return {
          result: { success: false, provider: 'local', error: `Artifact with ID "${artifactId}" not found.` },
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
          provider: renamed.provider || 'local',
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
        provider: 'local',
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
          provider: 'local',
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
        result: { success: false, error: `Unknown local workspace tool: ${toolName}` },
        updatedWorkspace: currentWs,
      };
  }
}

/**
 * Asynchronous executor for Google Docs, Google Drive, and Keep operations.
 */
export async function executeGoogleOperation(
  toolName: string,
  args: any,
  passedToken?: string,
  workspace?: Workspace
): Promise<WorkspaceOperationResult> {
  const currentWs: Workspace = {
    id: workspace?.id || 'default-workspace',
    name: workspace?.name || 'My Workspace',
    artifacts: Array.isArray(workspace?.artifacts) ? [...workspace.artifacts] : [],
    activeArtifactId: workspace?.activeArtifactId || null,
  };

  const safeArgs = args && typeof args === 'object' ? args : {};

  try {
    switch (toolName) {
      // ----------------------------------------
      // Google Docs Tools
      // ----------------------------------------
      case 'create_google_doc': {
        const title = typeof safeArgs.title === 'string' ? safeArgs.title.trim() : 'Elara Document';
        const content = typeof safeArgs.content === 'string' ? safeArgs.content : String(safeArgs.content || '');
        const targetArtifactId = typeof safeArgs.associateWithArtifactId === 'string' ? safeArgs.associateWithArtifactId.trim() : '';

        const docRes = await createGoogleDoc(title, content, passedToken);

        let updatedWs = currentWs;
        let modifiedId: string | undefined;

        // If targetArtifactId specified, associate external Google Doc ID & URL with local WorkspaceArtifact
        if (targetArtifactId) {
          const idx = updatedWs.artifacts.findIndex((a) => a.id === targetArtifactId);
          if (idx !== -1) {
            const updatedArt: WorkspaceArtifact = {
              ...updatedWs.artifacts[idx],
              provider: 'google_docs',
              externalId: docRes.documentId,
              url: docRes.url,
              linkedAt: Date.now(),
              lastSyncedAt: Date.now(),
              syncStatus: 'synchronized',
              syncBaselineHash: hashString(content),
              updatedAt: Date.now(),
            };
            const copy = [...updatedWs.artifacts];
            copy[idx] = updatedArt;
            updatedWs = { ...updatedWs, artifacts: copy };
            modifiedId = updatedArt.id;
          }
        }

        return {
          result: {
            success: true,
            provider: 'google_docs',
            documentId: docRes.documentId,
            title: docRes.title,
            url: docRes.url,
            message: `Successfully created Google Doc "${docRes.title}".`,
          },
          updatedWorkspace: updatedWs,
          modifiedArtifactId: modifiedId,
          externalDocUrl: docRes.url,
        };
      }

      case 'read_google_doc': {
        const documentId = typeof safeArgs.documentId === 'string' ? safeArgs.documentId.trim() : '';
        if (!documentId) {
          return {
            result: { success: false, provider: 'google_docs', error: 'documentId parameter is required.' },
            updatedWorkspace: currentWs,
          };
        }

        const doc = await getGoogleDoc(documentId, passedToken);
        return {
          result: {
            success: true,
            provider: 'google_docs',
            documentId: doc.documentId,
            title: doc.title,
            content: doc.content,
            url: doc.url,
          },
          updatedWorkspace: currentWs,
        };
      }

      case 'update_google_doc': {
        const documentId = typeof safeArgs.documentId === 'string' ? safeArgs.documentId.trim() : '';
        const content = typeof safeArgs.content === 'string' ? safeArgs.content : '';
        const mode = (safeArgs.mode === 'replace' || safeArgs.mode === 'prepend') ? safeArgs.mode : 'append';

        if (!documentId) {
          return {
            result: { success: false, provider: 'google_docs', error: 'documentId parameter is required.' },
            updatedWorkspace: currentWs,
          };
        }

        const editRes = await editGoogleDoc(documentId, content, mode, passedToken);
        return {
          result: {
            success: true,
            provider: 'google_docs',
            documentId: editRes.documentId,
            url: editRes.url,
            mode,
            message: `Successfully updated Google Doc (${mode} mode).`,
          },
          updatedWorkspace: currentWs,
          externalDocUrl: editRes.url,
        };
      }

      // ----------------------------------------
      // Google Drive Tools
      // ----------------------------------------
      case 'list_google_drive_files': {
        const pageSize = typeof safeArgs.pageSize === 'number' && safeArgs.pageSize > 0 ? safeArgs.pageSize : 10;
        const query = typeof safeArgs.query === 'string' ? safeArgs.query.trim() : '';
        const driveData = await listGoogleDriveFiles(pageSize, query, passedToken);

        return {
          result: {
            success: true,
            provider: 'google_drive',
            files: driveData.files,
            count: driveData.files.length,
          },
          updatedWorkspace: currentWs,
        };
      }

      case 'search_google_drive': {
        const query = typeof safeArgs.query === 'string' ? safeArgs.query.trim() : '';
        const pageSize = typeof safeArgs.pageSize === 'number' && safeArgs.pageSize > 0 ? safeArgs.pageSize : 10;

        if (!query) {
          return {
            result: { success: false, provider: 'google_drive', error: 'query parameter is required.' },
            updatedWorkspace: currentWs,
          };
        }

        const driveData = await searchGoogleDriveFiles(query, pageSize, passedToken);
        return {
          result: {
            success: true,
            provider: 'google_drive',
            query,
            files: driveData.files,
            count: driveData.files.length,
          },
          updatedWorkspace: currentWs,
        };
      }

      case 'read_google_drive_file': {
        const fileId = typeof safeArgs.fileId === 'string' ? safeArgs.fileId.trim() : '';
        if (!fileId) {
          return {
            result: { success: false, provider: 'google_drive', error: 'fileId parameter is required.' },
            updatedWorkspace: currentWs,
          };
        }

        const file = await readGoogleDriveFile(fileId, passedToken);
        return {
          result: {
            success: true,
            provider: 'google_drive',
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            content: file.content,
            url: file.webViewLink,
          },
          updatedWorkspace: currentWs,
        };
      }

      // ----------------------------------------
      // Google Keep / Archive Notes Tools
      // ----------------------------------------
      case 'create_keep_note': {
        const title = typeof safeArgs.title === 'string' ? safeArgs.title.trim() : 'Untitled Note';
        const content = typeof safeArgs.content === 'string' ? safeArgs.content : '';
        const tags = Array.isArray(safeArgs.tags) ? safeArgs.tags.map(String) : [];

        const note = await createKeepNote(title, content, tags);
        return {
          result: {
            success: true,
            provider: 'google_keep',
            noteId: note.id,
            title: note.title,
            tags: note.tags,
            url: note.url,
            message: 'Quick note saved to Keep archive' + (note.url ? ' and mirrored to Google Docs.' : '.'),
          },
          updatedWorkspace: currentWs,
        };
      }

      case 'read_keep_note': {
        const noteId = typeof safeArgs.noteId === 'string' ? safeArgs.noteId.trim() : '';
        if (!noteId) {
          return {
            result: { success: false, provider: 'google_keep', error: 'noteId parameter is required.' },
            updatedWorkspace: currentWs,
          };
        }

        const note = await getKeepNote(noteId);
        if (!note) {
          return {
            result: { success: false, provider: 'google_keep', error: `Note not found in Keep archive for ID/title: "${noteId}".` },
            updatedWorkspace: currentWs,
          };
        }

        return {
          result: {
            success: true,
            provider: 'google_keep',
            note,
          },
          updatedWorkspace: currentWs,
        };
      }

      case 'update_keep_note': {
        const noteId = typeof safeArgs.noteId === 'string' ? safeArgs.noteId.trim() : '';
        if (!noteId) {
          return {
            result: { success: false, provider: 'google_keep', error: 'noteId parameter is required.' },
            updatedWorkspace: currentWs,
          };
        }

        const updates: any = {};
        if (typeof safeArgs.title === 'string') updates.title = safeArgs.title;
        if (typeof safeArgs.content === 'string') updates.content = safeArgs.content;
        if (Array.isArray(safeArgs.tags)) updates.tags = safeArgs.tags.map(String);

        const updatedNote = await updateKeepNote(noteId, updates);
        if (!updatedNote) {
          return {
            result: { success: false, provider: 'google_keep', error: `Note not found with ID "${noteId}".` },
            updatedWorkspace: currentWs,
          };
        }

        return {
          result: {
            success: true,
            provider: 'google_keep',
            note: updatedNote,
          },
          updatedWorkspace: currentWs,
        };
      }

      // ----------------------------------------
      // Synchronization Tools
      // ----------------------------------------
      case 'link_google_doc': {
        const artifactId = typeof safeArgs.artifactId === 'string' ? safeArgs.artifactId.trim() : '';
        let documentId = typeof safeArgs.documentId === 'string' ? safeArgs.documentId.trim() : '';
        const initialSyncMode = typeof safeArgs.initialSyncMode === 'string' ? safeArgs.initialSyncMode.trim() : 'compare_only';
        
        if (!artifactId || !documentId) {
          return {
            result: { success: false, error: 'artifactId and documentId are required.' },
            updatedWorkspace: currentWs
          };
        }

        // Extract ID if URL passed
        const docIdMatch = documentId.match(/[-\w]{25,}/);
        if (docIdMatch) {
          documentId = docIdMatch[0];
        }

        const idx = currentWs.artifacts.findIndex(a => a.id === artifactId);
        if (idx === -1) {
          return {
            result: { success: false, error: 'Local artifact not found.' },
            updatedWorkspace: currentWs
          };
        }

        const art = currentWs.artifacts[idx];
        const doc = await getGoogleDoc(documentId, passedToken);
        const now = Date.now();
        
        let updatedArt: WorkspaceArtifact = {
          ...art,
          provider: 'google_docs',
          externalId: documentId,
          url: doc.url,
          linkedAt: now,
        };

        let message = '';
        if (initialSyncMode === 'local_to_google') {
          await editGoogleDoc(documentId, art.content, 'replace', passedToken);
          updatedArt.lastSyncedAt = now;
          updatedArt.syncStatus = 'synchronized';
          updatedArt.syncBaselineHash = hashString(art.content);
          message = 'Linked and replaced Google Doc with local content.';
        } else if (initialSyncMode === 'google_to_local') {
          updatedArt.content = doc.content;
          updatedArt.updatedAt = now;
          updatedArt.lastSyncedAt = now;
          updatedArt.syncStatus = 'synchronized';
          updatedArt.syncBaselineHash = hashString(doc.content);
          updatedArt = createRevisionForArtifact(updatedArt, 'google_sync', 'system');
          message = 'Linked and replaced local content with Google Doc.';
        } else {
          // compare_only
          const syncRes = compareSyncState(art.content, doc.content);
          updatedArt.syncStatus = syncRes.identical ? 'synchronized' : 'linked';
          if (syncRes.identical) {
             updatedArt.syncBaselineHash = syncRes.localHash;
          }
          message = `Linked documents. Initial status: ${updatedArt.syncStatus}`;
        }

        const copy = [...currentWs.artifacts];
        copy[idx] = updatedArt;
        
        return {
          result: {
            success: true,
            message,
            status: updatedArt.syncStatus
          },
          updatedWorkspace: { ...currentWs, artifacts: copy },
          modifiedArtifactId: updatedArt.id
        };
      }

      case 'refresh_google_doc': {
        const artifactId = typeof safeArgs.artifactId === 'string' ? safeArgs.artifactId.trim() : '';
        if (!artifactId) return { result: { success: false, error: 'artifactId required' }, updatedWorkspace: currentWs };

        const idx = currentWs.artifacts.findIndex(a => a.id === artifactId);
        if (idx === -1) return { result: { success: false, error: 'Artifact not found' }, updatedWorkspace: currentWs };

        const art = currentWs.artifacts[idx];
        if (!art.externalId || art.provider !== 'google_docs') {
          return { result: { success: false, error: 'Artifact is not linked to a Google Doc.' }, updatedWorkspace: currentWs };
        }

        const doc = await getGoogleDoc(art.externalId, passedToken);
        const syncRes = compareSyncState(art.content, doc.content, art.syncBaselineHash);
        
        const updatedArt: WorkspaceArtifact = {
          ...art,
          syncStatus: syncRes.status
        };

        const copy = [...currentWs.artifacts];
        copy[idx] = updatedArt;

        return {
          result: {
            success: true,
            status: syncRes.status,
            localChanged: syncRes.localChanged,
            remoteChanged: syncRes.remoteChanged
          },
          updatedWorkspace: { ...currentWs, artifacts: copy },
          modifiedArtifactId: updatedArt.id
        };
      }

      case 'sync_to_google_doc': {
        const artifactId = typeof safeArgs.artifactId === 'string' ? safeArgs.artifactId.trim() : '';
        const force = !!safeArgs.force;
        
        if (!artifactId) return { result: { success: false, error: 'artifactId required' }, updatedWorkspace: currentWs };

        const idx = currentWs.artifacts.findIndex(a => a.id === artifactId);
        if (idx === -1) return { result: { success: false, error: 'Artifact not found' }, updatedWorkspace: currentWs };

        const art = currentWs.artifacts[idx];
        if (!art.externalId || art.provider !== 'google_docs') {
          return { result: { success: false, error: 'Artifact is not linked to a Google Doc.' }, updatedWorkspace: currentWs };
        }

        const doc = await getGoogleDoc(art.externalId, passedToken);
        const syncRes = compareSyncState(art.content, doc.content, art.syncBaselineHash);

        if (syncRes.status === 'remote_ahead' && !force) {
          return { result: { success: false, error: 'Remote document has newer changes. Sync rejected.', status: 'remote_ahead', requiresResolution: true }, updatedWorkspace: currentWs };
        }
        if (syncRes.status === 'conflict' && !force) {
          return { result: { success: false, error: 'Both local and remote documents have changed. Conflict detected. Sync rejected.', status: 'conflict', requiresResolution: true }, updatedWorkspace: currentWs };
        }
        if (syncRes.status === 'linked' && !force) {
          return { result: { success: false, error: 'Documents are linked but have different content and no common baseline. Sync rejected.', status: 'conflict', requiresResolution: true }, updatedWorkspace: currentWs };
        }

        await editGoogleDoc(art.externalId, art.content, 'replace', passedToken);
        const now = Date.now();
        
        const updatedArt: WorkspaceArtifact = {
          ...art,
          lastSyncedAt: now,
          syncStatus: 'synchronized',
          syncBaselineHash: hashString(art.content)
        };

        const copy = [...currentWs.artifacts];
        copy[idx] = updatedArt;

        return {
          result: { success: true, message: 'Successfully synced local changes to Google Doc.', status: 'synchronized' },
          updatedWorkspace: { ...currentWs, artifacts: copy },
          modifiedArtifactId: updatedArt.id
        };
      }

      case 'sync_from_google_doc': {
        const artifactId = typeof safeArgs.artifactId === 'string' ? safeArgs.artifactId.trim() : '';
        const force = !!safeArgs.force;
        
        if (!artifactId) return { result: { success: false, error: 'artifactId required' }, updatedWorkspace: currentWs };

        const idx = currentWs.artifacts.findIndex(a => a.id === artifactId);
        if (idx === -1) return { result: { success: false, error: 'Artifact not found' }, updatedWorkspace: currentWs };

        const art = currentWs.artifacts[idx];
        if (!art.externalId || art.provider !== 'google_docs') {
          return { result: { success: false, error: 'Artifact is not linked to a Google Doc.' }, updatedWorkspace: currentWs };
        }

        const doc = await getGoogleDoc(art.externalId, passedToken);
        const syncRes = compareSyncState(art.content, doc.content, art.syncBaselineHash);

        if (syncRes.status === 'local_ahead' && !force) {
          return { result: { success: false, error: 'Local document has newer changes. Sync rejected.', status: 'local_ahead', requiresResolution: true }, updatedWorkspace: currentWs };
        }
        if (syncRes.status === 'conflict' && !force) {
          return { result: { success: false, error: 'Both local and remote documents have changed. Conflict detected. Sync rejected.', status: 'conflict', requiresResolution: true }, updatedWorkspace: currentWs };
        }
        if (syncRes.status === 'linked' && !force) {
          return { result: { success: false, error: 'Documents are linked but have different content and no common baseline. Sync rejected.', status: 'conflict', requiresResolution: true }, updatedWorkspace: currentWs };
        }

        const now = Date.now();
        let updatedArt: WorkspaceArtifact = {
          ...art,
          content: doc.content,
          updatedAt: now,
          lastSyncedAt: now,
          syncStatus: 'synchronized',
          syncBaselineHash: hashString(doc.content)
        };
        updatedArt = createRevisionForArtifact(updatedArt, 'google_sync', 'system');

        const copy = [...currentWs.artifacts];
        copy[idx] = updatedArt;

        return {
          result: { success: true, message: 'Successfully synced Google Doc to local workspace.', status: 'synchronized' },
          updatedWorkspace: { ...currentWs, artifacts: copy },
          modifiedArtifactId: updatedArt.id
        };
      }

      case 'compare_artifact_with_google_doc': {
        const artifactId = typeof safeArgs.artifactId === 'string' ? safeArgs.artifactId.trim() : '';
        if (!artifactId) return { result: { success: false, error: 'artifactId required' }, updatedWorkspace: currentWs };

        const idx = currentWs.artifacts.findIndex(a => a.id === artifactId);
        if (idx === -1) return { result: { success: false, error: 'Artifact not found' }, updatedWorkspace: currentWs };

        const art = currentWs.artifacts[idx];
        if (!art.externalId || art.provider !== 'google_docs') {
          return { result: { success: false, error: 'Artifact is not linked to a Google Doc.' }, updatedWorkspace: currentWs };
        }

        const doc = await getGoogleDoc(art.externalId, passedToken);
        const diffs = computeLineDiff(doc.content, art.content);
        const syncRes = compareSyncState(art.content, doc.content, art.syncBaselineHash);

        return {
          result: {
            success: true,
            status: syncRes.status,
            diff: diffs.map(d => ({
              type: d.added ? 'local_added' : (d.removed ? 'remote_removed' : 'unchanged'),
              value: d.value
            }))
          },
          updatedWorkspace: currentWs
        };
      }

      default:
        return {
          result: { success: false, error: `Unknown tool: ${toolName}` },
          updatedWorkspace: currentWs,
        };
    }
  } catch (err: any) {
    const errorMsg = err?.message || String(err || 'Unknown Google operation failure');
    const isAuthErr = errorMsg.includes('401') || errorMsg.includes('auth') || errorMsg.includes('sign in') || errorMsg.includes('token');

    return {
      result: {
        success: false,
        error: isAuthErr
          ? 'Google Workspace authorization required. Please connect your Google account in Settings to use Google Drive and Google Docs.'
          : `Google operation failed: ${errorMsg}`,
      },
      updatedWorkspace: currentWs,
    };
  }
}

/**
 * Unified tool executor routing to local workspace operations or Google operations.
 */
export async function executeAnyWorkspaceTool(
  workspace: Workspace,
  toolName: string,
  args: any,
  passedToken?: string
): Promise<WorkspaceOperationResult> {
  const localTools = [
    'create_artifact',
    'read_artifact',
    'update_artifact',
    'list_artifacts',
    'rename_artifact',
    'generate_canvas',
  ];

  if (localTools.includes(toolName)) {
    return executeWorkspaceOperation(workspace, toolName, args);
  }

  return executeGoogleOperation(toolName, args, passedToken, workspace);
}

export function buildWorkspaceContextPrompt(workspace?: Workspace | null, googleConnected = false): string {
  let prompt = `\n[DOCUMENT SYSTEMS ARCHITECTURE & INSTRUCTIONS]\n`;
  prompt += `Elara has two distinct document layers:\n`;
  prompt += `1. **Local Persistent Workspace** (Canonical Local Storage):
- Tools: \`create_artifact\`, \`read_artifact\`, \`update_artifact\`, \`list_artifacts\`, \`rename_artifact\`
- Use by default whenever the user asks to create, draft, edit, review, or organize documents, SOPs, checklists, scripts, or plans without specifying Google.
- All documents created with \`create_artifact\` are permanently saved in the user's Workspace.

2. **Google Workspace Cloud Provider** (External Cloud Integration):
- Google Docs: \`create_google_doc\`, \`read_google_doc\`, \`update_google_doc\`
- Google Drive: \`list_google_drive_files\`, \`search_google_drive\`, \`read_google_drive_file\`
- Google Keep Archive: \`create_keep_note\`, \`read_keep_note\`, \`update_keep_note\`
- Use Google tools ONLY when the user explicitly requests Google Docs, Google Drive, or Google Keep operations.
- Google Docs and Drive are external providers and do NOT replace the canonical local WorkspaceArtifact unless explicitly linked.
- Google Authentication Status: ${googleConnected || isGoogleConnected() ? 'CONNECTED' : 'NOT CONNECTED (will prompt if called)'}\n\n`;

  if (!workspace || !Array.isArray(workspace.artifacts) || workspace.artifacts.length === 0) {
    prompt += `[WORKSPACE STATUS]\nThe user's local Workspace is currently empty.\n`;
    return prompt;
  }

  const active = workspace.activeArtifactId
    ? workspace.artifacts.find((a) => a.id === workspace.activeArtifactId)
    : null;

  prompt += `[CURRENT WORKSPACE STATE]\n`;
  if (active) {
    prompt += `Active Document Currently Open in Workspace:\n- Title: "${active.name}" (ID: ${active.id}, Type: ${active.type}, Provider: ${active.provider || 'local'}${active.url ? `, External URL: ${active.url}` : ''})\n`;
  } else {
    prompt += `No document is currently active.\n`;
  }

  prompt += `\nAll Available Documents in Workspace (${workspace.artifacts.length}):\n`;
  for (const art of workspace.artifacts) {
    prompt += `- "${art.name}" (ID: ${art.id}, Type: ${art.type}, Provider: ${art.provider || 'local'})\n`;
  }

  prompt += `\nExecution Rules:
1. To draft a new document/SOP/guide, call \`create_artifact\`.
2. To modify an existing local document, first inspect it via \`read_artifact\` if needed, then call \`update_artifact\` with the full revised content. Never call \`create_artifact\` to update an existing document.
3. When the user says "this document" or refers to an open file, target the Active Document.
4. To export or create a file in Google Docs, call \`create_google_doc\`.
5. To search or read existing files from the user's Google Drive, call \`search_google_drive\` or \`read_google_drive_file\`.
`;

  return prompt;
}
