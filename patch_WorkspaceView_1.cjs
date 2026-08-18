const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceView.tsx', 'utf8');

// Unmount flush and checkpoint
code = code.replace(
  `      if (activeArtifactRef.current && localContentRef.current !== activeArtifactRef.current.content) {\n        const ws = getWorkspace();\n        updateArtifact(ws, activeArtifactRef.current.id, { content: localContentRef.current });\n      }`,
  `      if (activeArtifactRef.current) {\n        let ws = getWorkspace();\n        if (localContentRef.current !== activeArtifactRef.current.content) {\n          ws = updateArtifact(ws, activeArtifactRef.current.id, { content: localContentRef.current });\n        }\n        createCheckpoint(ws, activeArtifactRef.current.id, 'user', 'user');\n      }`
);

// handleCreate switch checkpoint
code = code.replace(
  `  const handleCreate = (type: 'text' | 'markdown' = 'text') => {\n    // Flush current active if needed\n    if (activeArtifact && localContent !== activeArtifact.content) {\n      updateArtifact(workspace, activeArtifact.id, { content: localContent });\n    }\n    const updated = createArtifact(workspace, type === 'markdown' ? 'Untitled.md' : 'Untitled', type);`,
  `  const handleCreate = (type: 'text' | 'markdown' = 'text') => {\n    // Flush current active if needed\n    let currentWs = workspace;\n    if (activeArtifact) {\n      if (localContent !== activeArtifact.content) {\n        currentWs = updateArtifact(workspace, activeArtifact.id, { content: localContent });\n      }\n      currentWs = createCheckpoint(currentWs, activeArtifact.id, 'user', 'user');\n    }\n    const updated = createArtifact(currentWs, type === 'markdown' ? 'Untitled.md' : 'Untitled', type);`
);

// handleSelect switch checkpoint
code = code.replace(
  `  const handleSelect = (id: string) => {\n    // Flush current before switching\n    let currentWs = workspace;\n    if (activeArtifact && localContent !== activeArtifact.content) {\n      currentWs = updateArtifact(workspace, activeArtifact.id, { content: localContent });\n    }\n    const updated = setActiveArtifact(id);`,
  `  const handleSelect = (id: string) => {\n    // Flush current before switching\n    let currentWs = workspace;\n    if (activeArtifact) {\n      if (localContent !== activeArtifact.content) {\n        currentWs = updateArtifact(workspace, activeArtifact.id, { content: localContent });\n      }\n      currentWs = createCheckpoint(currentWs, activeArtifact.id, 'user', 'user');\n    }\n    const updated = setActiveArtifact(id);`
);

// Add state for history modal
code = code.replace(
  `  const [diffModal, setDiffModal] = useState<{isOpen: boolean, diffs: {type: string, value: string}[]} | null>(null);\n  const [linkModal, setLinkModal] = useState<{isOpen: boolean, linkUrl: string, linkMode: 'local_to_google'|'google_to_local'|'compare_only'} | null>(null);`,
  `  const [diffModal, setDiffModal] = useState<{isOpen: boolean, diffs: {type: string, value: string}[]} | null>(null);\n  const [linkModal, setLinkModal] = useState<{isOpen: boolean, linkUrl: string, linkMode: 'local_to_google'|'google_to_local'|'compare_only'} | null>(null);\n  const [historyModal, setHistoryModal] = useState<{isOpen: boolean, selectedRevisionId: string | null} | null>(null);`
);

fs.writeFileSync('src/components/WorkspaceView.tsx', code);
