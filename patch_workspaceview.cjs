const fs = require('fs');
let file = fs.readFileSync('src/components/WorkspaceView.tsx', 'utf8');

file = file.replace(
  `  useEffect(() => {
    const ws = getWorkspace();
    setWorkspace(ws);
    
    // Set initial content if there's an active artifact
    if (ws.activeArtifactId) {
      const active = ws.artifacts.find(a => a.id === ws.activeArtifactId);
      if (active) setLocalContent(active.content);
    }
  }, []);`,
  `  useEffect(() => {
    const loadWorkspace = () => {
      const ws = getWorkspace();
      setWorkspace(ws);
      
      if (ws.activeArtifactId) {
        const active = ws.artifacts.find(a => a.id === ws.activeArtifactId);
        if (active) setLocalContent(active.content);
      }
    };
    
    loadWorkspace();
    
    window.addEventListener('workspace-updated', loadWorkspace);
    return () => window.removeEventListener('workspace-updated', loadWorkspace);
  }, []);`
);

fs.writeFileSync('src/components/WorkspaceView.tsx', file);
