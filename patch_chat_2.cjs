const fs = require('fs');
let file = fs.readFileSync('server/routes/chat.ts', 'utf8');

file = file.replace(
  /config\.tools = \[.*?\];/s,
  `config.tools = [
        {
          functionDeclarations: [
            {
              name: 'create_artifact',
              description: 'Create a new artifact in the workspace. Returns the new artifact ID.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  type: { type: 'STRING', enum: ['text', 'markdown'] },
                  content: { type: 'STRING' }
                },
                required: ['name', 'type', 'content']
              }
            },
            {
              name: 'update_artifact',
              description: 'Update the content of an existing artifact. You must read it first if you need to preserve existing content.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  artifact_id: { type: 'STRING' },
                  content: { type: 'STRING' }
                },
                required: ['artifact_id', 'content']
              }
            },
            {
              name: 'read_artifact',
              description: 'Read the current content of an existing artifact.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  artifact_id: { type: 'STRING' }
                },
                required: ['artifact_id']
              }
            },
            {
              name: 'list_artifacts',
              description: 'List all available artifacts in the workspace.',
              parameters: {
                type: 'OBJECT',
                properties: {},
                required: []
              }
            },
            {
              name: 'rename_artifact',
              description: 'Rename an existing artifact.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  artifact_id: { type: 'STRING' },
                  name: { type: 'STRING' }
                },
                required: ['artifact_id', 'name']
              }
            },
            {
              name: 'delete_artifact',
              description: 'Delete an existing artifact.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  artifact_id: { type: 'STRING' }
                },
                required: ['artifact_id']
              }
            }
          ]
        }
      ];`
);

fs.writeFileSync('server/routes/chat.ts', file);
