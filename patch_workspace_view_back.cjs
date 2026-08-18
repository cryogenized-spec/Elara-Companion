const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceView.tsx', 'utf8');

const target = `const handleBackToChat = () => {`;
if (!code.includes(target)) {
    code = code.replace(
      `  const handleDelete = (id: string) => {`,
      `  const handleBackToChat = () => {
    if (activeArtifact) {
      let currentWs = workspace;
      if (localContent !== activeArtifact.content) {
        currentWs = updateArtifact(workspace, activeArtifact.id, { content: localContent });
      }
      createCheckpoint(currentWs, activeArtifact.id, 'user', 'user');
    }
    if (onBackToChat) onBackToChat();
  };

  const handleDelete = (id: string) => {`
    );
    
    code = code.replace(
      `onClick={onBackToChat}`,
      `onClick={handleBackToChat}`
    );
    
    code = code.replace(
      `onClick={onBackToChat}`,
      `onClick={handleBackToChat}`
    );
}

// Unmount checkpoint logic
code = code.replace(
  `    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (activeArtifactRef.current) {
        let ws = getWorkspace();
        if (localContentRef.current !== activeArtifactRef.current.content) {
          ws = updateArtifact(ws, activeArtifactRef.current.id, { content: localContentRef.current });
        }
        createCheckpoint(ws, activeArtifactRef.current.id, 'user', 'user');
      }
    };`,
  `    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (activeArtifactRef.current) {
        let ws = getWorkspace();
        if (localContentRef.current !== activeArtifactRef.current.content) {
          ws = updateArtifact(ws, activeArtifactRef.current.id, { content: localContentRef.current });
        }
        createCheckpoint(ws, activeArtifactRef.current.id, 'user', 'user');
      }
    };`
);

fs.writeFileSync('src/components/WorkspaceView.tsx', code);
