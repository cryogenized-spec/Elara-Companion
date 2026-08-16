const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

file = file.replace(
  `    let backgroundWorkspaceContext = '';`,
  `    let backgroundWorkspaceContext = '';
    
    // Inject Canvas / Workspace context
    const ws = getWorkspace();
    if (ws.artifacts.length > 0) {
      let wsCtx = \`\\n\\n[LOCAL WORKSPACE CONTEXT]\\nYou have access to the user's local workspace artifacts via the provided function calling tools. Use them to create, read, update, or delete artifacts.\\n\`;
      wsCtx += \`Available artifacts (ID - Name):\\n\`;
      ws.artifacts.forEach(a => {
        wsCtx += \` - \${a.id} : "\${a.name}" (\${a.type})\\n\`;
      });
      if (ws.activeArtifactId) {
        const active = ws.artifacts.find(a => a.id === ws.activeArtifactId);
        if (active) {
          wsCtx += \`\\nCurrently ACTIVE artifact in the user's view:\\nID: \${active.id}\\nName: \${active.name}\\nType: \${active.type}\\nContent:\\n\` + active.content.slice(0, 3000) + (active.content.length > 3000 ? '\\n...[truncated]' : '') + \`\\n\`;
        }
      }
      backgroundWorkspaceContext += wsCtx;
    }`
);

fs.writeFileSync('src/App.tsx', file);
