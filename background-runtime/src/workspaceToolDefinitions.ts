export const durableWorkspaceTools = [
  { name: 'create_artifact', description: 'Create a persistent local Workspace document. Use for documents, SOPs, guides, plans, checklists, scripts, templates, or other saved work.', parameters: { type: 'OBJECT', properties: { name: { type: 'STRING' }, type: { type: 'STRING', description: 'markdown or text' }, content: { type: 'STRING' } }, required: ['name', 'content'] } },
  { name: 'read_artifact', description: 'Read an existing local Workspace artifact by artifactId.', parameters: { type: 'OBJECT', properties: { artifactId: { type: 'STRING' } }, required: ['artifactId'] } },
  { name: 'update_artifact', description: 'Replace the full content of an existing local Workspace artifact.', parameters: { type: 'OBJECT', properties: { artifactId: { type: 'STRING' }, content: { type: 'STRING' } }, required: ['artifactId', 'content'] } },
  { name: 'list_artifacts', description: 'List the local Workspace artifacts available to Elara.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'rename_artifact', description: 'Rename a local Workspace artifact without changing its ID or content.', parameters: { type: 'OBJECT', properties: { artifactId: { type: 'STRING' }, name: { type: 'STRING' } }, required: ['artifactId', 'name'] } },
  { name: 'generate_canvas', description: 'Create a long-form document/canvas as a persistent local artifact.', parameters: { type: 'OBJECT', properties: { title: { type: 'STRING' }, content: { type: 'STRING' } }, required: ['title', 'content'] } },
] as const;
