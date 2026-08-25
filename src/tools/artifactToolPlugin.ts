import { executeAnyWorkspaceTool } from '../lib/workspaceTools';
import type { AgentToolDeclaration, ToolPlugin } from './toolPluginTypes';

const ARTIFACT_TOOL_NAMES = new Set([
  'create_artifact',
  'read_artifact',
  'update_artifact',
  'list_artifacts',
  'rename_artifact',
]);

export const artifactToolDeclarations: readonly AgentToolDeclaration[] = [
  {
    name: 'create_artifact',
    description: 'Create a persistent document in the local Workspace.',
    capabilities: ['workspace.write'],
    effects: ['write'],
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Title or filename.' },
        type: { type: 'STRING', description: 'markdown or text; defaults to markdown.' },
        content: { type: 'STRING', description: 'Complete document content.' },
      },
      required: ['name', 'content'],
    },
  },
  {
    name: 'read_artifact',
    description: 'Read an existing local Workspace document by artifactId.',
    capabilities: ['workspace.read'],
    effects: ['read'],
    parameters: {
      type: 'OBJECT',
      properties: { artifactId: { type: 'STRING', description: 'Workspace artifact ID.' } },
      required: ['artifactId'],
    },
  },
  {
    name: 'update_artifact',
    description: 'Replace the content of an existing local Workspace document.',
    capabilities: ['workspace.write'],
    effects: ['write'],
    parameters: {
      type: 'OBJECT',
      properties: {
        artifactId: { type: 'STRING', description: 'Workspace artifact ID.' },
        content: { type: 'STRING', description: 'Full updated document content.' },
      },
      required: ['artifactId', 'content'],
    },
  },
  {
    name: 'list_artifacts',
    description: 'List documents currently available in the local Workspace.',
    capabilities: ['workspace.read'],
    effects: ['read'],
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'rename_artifact',
    description: 'Rename an existing local Workspace document without changing its ID or content.',
    capabilities: ['workspace.write'],
    effects: ['write'],
    parameters: {
      type: 'OBJECT',
      properties: {
        artifactId: { type: 'STRING', description: 'Workspace artifact ID.' },
        name: { type: 'STRING', description: 'New document name.' },
      },
      required: ['artifactId', 'name'],
    },
  },
];

export const artifactToolPlugin: ToolPlugin = {
  id: 'artifacts',
  version: 1,
  declarations: artifactToolDeclarations,
  owns: (toolName) => ARTIFACT_TOOL_NAMES.has(toolName),
  execute: async ({ workspace, toolName, args, googleToken }) =>
    executeAnyWorkspaceTool(workspace, toolName, args, googleToken),
};
