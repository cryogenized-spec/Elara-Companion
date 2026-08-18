const fs = require('fs');
let code = fs.readFileSync('src/lib/workspaceTools.ts', 'utf8');

// 1. Add import
if (!code.includes('createRevisionForArtifact')) {
  code = code.replace(
    "import { compareSyncState, computeLineDiff, hashString } from './syncUtils';",
    "import { compareSyncState, computeLineDiff, hashString } from './syncUtils';\nimport { createRevisionForArtifact } from './revisionUtils';"
  );
}

// 2. create_artifact
code = code.replace(
  `      const newArtifact: WorkspaceArtifact = {\n        id: artifactId,\n        name: rawName,\n        content,\n        type,\n        provider: 'local',\n        createdAt: now,\n        updatedAt: now,\n      };\n      const updatedWorkspace: Workspace = {`,
  `      let newArtifact: WorkspaceArtifact = {\n        id: artifactId,\n        name: rawName,\n        content,\n        type,\n        provider: 'local',\n        createdAt: now,\n        updatedAt: now,\n      };\n      newArtifact = createRevisionForArtifact(newArtifact, 'agent', 'agent');\n      const updatedWorkspace: Workspace = {`
);

// 3. update_artifact
code = code.replace(
  `      const updatedArtifact: WorkspaceArtifact = {\n        ...existingArtifact,\n        content: safeArgs.content,\n        updatedAt: now,\n      };\n      const updatedArtifacts = [...currentWs.artifacts];`,
  `      let updatedArtifact: WorkspaceArtifact = {\n        ...existingArtifact,\n        content: safeArgs.content,\n        updatedAt: now,\n      };\n      updatedArtifact = createRevisionForArtifact(updatedArtifact, 'agent', 'agent');\n      const updatedArtifacts = [...currentWs.artifacts];`
);

// 4. link_google_doc (google_to_local)
code = code.replace(
  `          message = 'Linked and replaced local content with Google Doc.';\n        } else {\n          // compare_only`,
  `          updatedArt = createRevisionForArtifact(updatedArt, 'google_sync', 'system');\n          message = 'Linked and replaced local content with Google Doc.';\n        } else {\n          // compare_only`
);

// 5. sync_from_google_doc
code = code.replace(
  `        const updatedArt: WorkspaceArtifact = {\n          ...art,\n          content: doc.content,\n          updatedAt: now,\n          lastSyncedAt: now,\n          syncStatus: 'synchronized',\n          syncBaselineHash: hashString(doc.content)\n        };\n        const copy = [...currentWs.artifacts];`,
  `        let updatedArt: WorkspaceArtifact = {\n          ...art,\n          content: doc.content,\n          updatedAt: now,\n          lastSyncedAt: now,\n          syncStatus: 'synchronized',\n          syncBaselineHash: hashString(doc.content)\n        };\n        updatedArt = createRevisionForArtifact(updatedArt, 'google_sync', 'system');\n        const copy = [...currentWs.artifacts];`
);

fs.writeFileSync('src/lib/workspaceTools.ts', code);
