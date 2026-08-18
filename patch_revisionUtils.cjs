const fs = require('fs');
let code = fs.readFileSync('src/lib/revisionUtils.ts', 'utf8');

code = "import { saveWorkspace } from './workspaceStorage';\n" + code;

code = code.replace(
  `  return {\n    ...workspace,\n    artifacts: workspace.artifacts.map(a => a.id === artifactId ? artifactWithRestoreRev : a)\n  };`,
  `  const updatedWs = {\n    ...workspace,\n    artifacts: workspace.artifacts.map(a => a.id === artifactId ? artifactWithRestoreRev : a)\n  };\n  saveWorkspace(updatedWs);\n  return updatedWs;`
);

code = code.replace(
  `  return {\n    ...workspace,\n    artifacts: workspace.artifacts.map(a => a.id === artifactId ? artifactWithRevision : a)\n  };`,
  `  const updatedWs = {\n    ...workspace,\n    artifacts: workspace.artifacts.map(a => a.id === artifactId ? artifactWithRevision : a)\n  };\n  saveWorkspace(updatedWs);\n  return updatedWs;`
);

fs.writeFileSync('src/lib/revisionUtils.ts', code);
