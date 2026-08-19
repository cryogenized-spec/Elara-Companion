const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const partsDir = path.join(__dirname, 'adult-fiction-parts');
function restore(outRel, prefix, count) {
  let b64 = '';
  for (let i = 0; i < count; i++) {
    b64 += fs.readFileSync(path.join(partsDir, prefix + '-' + i + '.txt'), 'utf8').trim();
  }
  const buf = zlib.gunzipSync(Buffer.from(b64, 'base64'));
  const outPath = path.join(__dirname, '..', outRel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log('Wrote', outRel, buf.length);
}
restore('src/App.tsx', 'app', 5);
restore('src/components/SettingsModal.tsx', 'settings', 10);
