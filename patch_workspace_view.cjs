const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceView.tsx', 'utf8');

// handleCreate
code = code.replace(
  `  const handleCreate = (type: 'text' | 'markdown' = 'text') => {
    // Flush current active if needed
    if (activeArtifact && localContent !== activeArtifact.content) {
      updateArtifact(workspace, activeArtifact.id, { content: localContent });
    }
    const updated = createArtifact(workspace, type === 'markdown' ? 'Untitled.md' : 'Untitled', type);`,
  `  const handleCreate = (type: 'text' | 'markdown' = 'text') => {
    // Flush current active if needed
    let currentWs = workspace;
    if (activeArtifact) {
      if (localContent !== activeArtifact.content) {
        currentWs = updateArtifact(workspace, activeArtifact.id, { content: localContent });
      }
      currentWs = createCheckpoint(currentWs, activeArtifact.id, 'user', 'user');
    }
    const updated = createArtifact(currentWs, type === 'markdown' ? 'Untitled.md' : 'Untitled', type);`
);

// handleSelect
code = code.replace(
  `  const handleSelect = (id: string) => {
    // Flush current before switching
    let currentWs = workspace;
    if (activeArtifact && localContent !== activeArtifact.content) {
      currentWs = updateArtifact(workspace, activeArtifact.id, { content: localContent });
    }

    const updated = setActiveArtifact(id);`,
  `  const handleSelect = (id: string) => {
    // Flush current before switching
    let currentWs = workspace;
    if (activeArtifact) {
      if (localContent !== activeArtifact.content) {
        currentWs = updateArtifact(workspace, activeArtifact.id, { content: localContent });
      }
      currentWs = createCheckpoint(currentWs, activeArtifact.id, 'user', 'user');
    }

    // Set active artifact by id but update workspace manually to preserve checkpoint history if activeArtifact changed
    let updated = setActiveArtifact(id);
    updated = { ...updated, artifacts: currentWs.artifacts }; // keep the updated artifacts`
);

fs.writeFileSync('src/components/WorkspaceView.tsx', code);
