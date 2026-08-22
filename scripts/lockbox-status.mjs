import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config/lockbox.manifest.json'), 'utf8'));

const present = (env, name) => typeof env[name] === 'string' && env[name].trim().length > 0;

export function buildLockboxStatus(env = process.env) {
  return manifest.entries.map((entry) => ({
    name: entry.name,
    class: entry.class,
    exposure: entry.exposure,
    requiredBy: entry.scope,
    rotation: entry.rotation || null,
    status: entry.exposure.includes('ci') || entry.exposure.includes('server')
      ? (present(env, entry.name) ? 'configured' : 'missing')
      : 'managed-by-runtime',
  }));
}

export function summarizeLockboxStatus(rows) {
  return {
    total: rows.length,
    configured: rows.filter((row) => row.status === 'configured').length,
    missing: rows.filter((row) => row.status === 'missing').length,
    managedByRuntime: rows.filter((row) => row.status === 'managed-by-runtime').length,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = buildLockboxStatus();
  const summary = summarizeLockboxStatus(rows);
  console.log(`Elara Lockbox — Pass ${manifest.pass}`);
  console.log(`Configured: ${summary.configured} | Missing: ${summary.missing} | Managed by runtime: ${summary.managedByRuntime}`);
  console.log('');
  for (const row of rows) {
    console.log(`${row.status === 'configured' ? '✓' : row.status === 'missing' ? '✗' : '•'} ${row.name} [${row.class}]`);
  }
}
