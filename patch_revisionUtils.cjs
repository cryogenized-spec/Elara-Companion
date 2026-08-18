const fs = require('fs');
let code = fs.readFileSync('src/lib/revisionUtils.ts', 'utf8');

if (!code.includes('import { computeLineDiff }')) {
    code = code.replace(
        `import { hashString } from './syncUtils';`,
        `import { hashString, computeLineDiff, DiffResult } from './syncUtils';`
    );
}

const appendCode = `
export interface RevisionComparisonResult {
  success: boolean;
  error?: string;
  revisionA?: ArtifactRevision;
  revisionB?: ArtifactRevision;
  identical?: boolean;
  hunks?: DiffResult[];
}

export function compareRevisions(
  workspace: Workspace,
  artifactId: string,
  revisionAId: string,
  revisionBId: string
): RevisionComparisonResult {
  const artifact = workspace.artifacts.find(a => a.id === artifactId);
  if (!artifact) {
    return { success: false, error: 'Artifact not found' };
  }

  const revisions = artifact.revisions || [];
  const revisionA = revisions.find(r => r.id === revisionAId);
  if (!revisionA) {
    return { success: false, error: 'Revision A not found in this artifact' };
  }

  const revisionB = revisions.find(r => r.id === revisionBId);
  if (!revisionB) {
    return { success: false, error: 'Revision B not found in this artifact' };
  }

  const identical = revisionA.contentHash === revisionB.contentHash;
  let hunks: DiffResult[] = [];
  
  if (!identical) {
    hunks = computeLineDiff(revisionA.content, revisionB.content);
  }

  return {
    success: true,
    revisionA,
    revisionB,
    identical,
    hunks
  };
}
`;

if (!code.includes('export function compareRevisions')) {
    code += appendCode;
    fs.writeFileSync('src/lib/revisionUtils.ts', code);
}
