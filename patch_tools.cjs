const fs = require('fs');
let code = fs.readFileSync('src/lib/workspaceTools.ts', 'utf8');

if (!code.includes("import { createRevisionForArtifact }")) {
    code = code.replace(
        "import { compareSyncState, computeLineDiff, hashString } from './syncUtils';",
        "import { compareSyncState, computeLineDiff, hashString } from './syncUtils';\nimport { createRevisionForArtifact } from './revisionUtils';"
    );
}

// 1. create_artifact
code = code.replace(
  `      const newArtifact: WorkspaceArtifact = {
        id: artifactId,
        name: rawName,
        content,
        type,
        provider: 'local',
        createdAt: now,
        updatedAt: now,
      };

      const updatedWorkspace: Workspace = {`,
  `      let newArtifact: WorkspaceArtifact = {
        id: artifactId,
        name: rawName,
        content,
        type,
        provider: 'local',
        createdAt: now,
        updatedAt: now,
      };
      newArtifact = createRevisionForArtifact(newArtifact, 'agent', 'agent');

      const updatedWorkspace: Workspace = {`
);

// 2. update_artifact
code = code.replace(
  `      const updatedArtifact: WorkspaceArtifact = {
        ...existingArtifact,
        content: safeArgs.content,
        updatedAt: now,
      };

      const updatedArtifacts = [...currentWs.artifacts];`,
  `      let updatedArtifact: WorkspaceArtifact = {
        ...existingArtifact,
        content: safeArgs.content,
        updatedAt: now,
      };
      updatedArtifact = createRevisionForArtifact(updatedArtifact, 'agent', 'agent');

      const updatedArtifacts = [...currentWs.artifacts];`
);

// 3. sync_from_google_doc
code = code.replace(
  `        const updatedArt: WorkspaceArtifact = {
          ...art,
          content: doc.content,
          updatedAt: now,
          lastSyncedAt: now,
          syncStatus: 'synchronized',
          syncBaselineHash: hashString(doc.content)
        };

        const copy = [...currentWs.artifacts];`,
  `        let updatedArt: WorkspaceArtifact = {
          ...art,
          content: doc.content,
          updatedAt: now,
          lastSyncedAt: now,
          syncStatus: 'synchronized',
          syncBaselineHash: hashString(doc.content)
        };
        updatedArt = createRevisionForArtifact(updatedArt, 'google_sync', 'system');

        const copy = [...currentWs.artifacts];`
);

// 4. link_google_doc (google_to_local)
code = code.replace(
  `        } else if (initialSyncMode === 'google_to_local') {
          updatedArt.content = doc.content;
          updatedArt.updatedAt = now;
          updatedArt.lastSyncedAt = now;
          updatedArt.syncStatus = 'synchronized';
          updatedArt.syncBaselineHash = hashString(doc.content);
          message = 'Linked and replaced local content with Google Doc.';`,
  `        } else if (initialSyncMode === 'google_to_local') {
          updatedArt.content = doc.content;
          updatedArt.updatedAt = now;
          updatedArt.lastSyncedAt = now;
          updatedArt.syncStatus = 'synchronized';
          updatedArt.syncBaselineHash = hashString(doc.content);
          updatedArt = createRevisionForArtifact(updatedArt, 'google_sync', 'system');
          message = 'Linked and replaced local content with Google Doc.';`
);


fs.writeFileSync('src/lib/workspaceTools.ts', code);
