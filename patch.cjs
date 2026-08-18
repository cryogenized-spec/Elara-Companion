const fs = require('fs');
let code = fs.readFileSync('src/lib/syncUtils.ts', 'utf8');

const regex = /let status: SyncStatus = 'unlinked';[\s\S]*?status = 'conflict';\n  }/m;
const replacement = `let status: SyncStatus = 'unlinked';
  if (identical) {
    status = 'synchronized';
  } else if (baselineHash) {
    if (localChanged && !remoteChanged) {
      status = 'local_ahead';
    } else if (!localChanged && remoteChanged) {
      status = 'remote_ahead';
    } else {
      status = 'conflict';
    }
  } else {
    status = 'linked';
  }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/lib/syncUtils.ts', code);
