const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceView.tsx', 'utf8');

const target = `{(!activeArtifact.provider || activeArtifact.provider === 'local') && (
                  <button onClick={() => {`;

const replacement = `{(!activeArtifact.provider || activeArtifact.provider === 'local') && (
                  <>
                  <button onClick={() => {`;

const targetEnd = `                    Link Google Doc
                  </button>
                )}`;

const replacementEnd = `                    Link Google Doc
                  </button>
                  </>
                )}`;

code = code.replace(target, replacement);
code = code.replace(targetEnd, replacementEnd);

fs.writeFileSync('src/components/WorkspaceView.tsx', code);
