const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceView.tsx', 'utf8');

if (!code.includes('createCheckpoint')) {
  code = code.replace(
    "import { executeAnyWorkspaceTool } from '../lib/workspaceTools';",
    "import { executeAnyWorkspaceTool } from '../lib/workspaceTools';\nimport { createCheckpoint, restoreRevision } from '../lib/revisionUtils';"
  );
}

fs.writeFileSync('src/components/WorkspaceView.tsx', code);
