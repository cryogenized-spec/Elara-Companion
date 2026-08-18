const fs = require('fs');
let code = fs.readFileSync('src/lib/syncUtils.ts', 'utf8');
code = code.replace(
`  let status: SyncStatus = 'unlinked';
  if (identical) {
    status = 'synchronized';
  } else if (localChanged && !remoteChanged) {
    status = 'local_ahead';
  } else if (!localChanged && remoteChanged) {
    status = 'remote_ahead';
  } else if (localChanged && remoteChanged) {
    status = 'conflict';
  }`,
`  let status: SyncStatus = 'unlinked';
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
  }`
);
fs.writeFileSync('src/lib/syncUtils.ts', code);
