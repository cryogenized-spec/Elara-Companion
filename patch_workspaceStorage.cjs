const fs = require('fs');
let code = fs.readFileSync('src/lib/workspaceStorage.ts', 'utf8');

if (!code.includes("import { createCheckpoint }")) {
  code = code.replace(
    `import { generateUniqueId } from './storage';`,
    `import { generateUniqueId } from './storage';\nimport { createCheckpoint } from './revisionUtils';`
  );
}

// saveAgentArtifact
code = code.replace(
  `      const updatedWs = updateArtifact(ws, existingId, {
        name: name || existing.name,
        content,
        type: type || existing.type,
      });
      return updatedWs.artifacts.find((a) => a.id === existingId)!;`,
  `      let updatedWs = updateArtifact(ws, existingId, {
        name: name || existing.name,
        content,
        type: type || existing.type,
      });
      updatedWs = createCheckpoint(updatedWs, existingId, 'agent', 'agent');
      return updatedWs.artifacts.find((a) => a.id === existingId)!;`
);

code = code.replace(
  `  const updated = {
    ...ws,
    artifacts: [...ws.artifacts, newArtifact],
    activeArtifactId: newArtifact.id,
  };
  saveWorkspace(updated);
  return newArtifact;`,
  `  let updated = {
    ...ws,
    artifacts: [...ws.artifacts, newArtifact],
    activeArtifactId: newArtifact.id,
  };
  updated = createCheckpoint(updated, newArtifact.id, 'agent', 'agent');
  saveWorkspace(updated);
  return updated.artifacts.find(a => a.id === newArtifact.id)!;`
);

fs.writeFileSync('src/lib/workspaceStorage.ts', code);
