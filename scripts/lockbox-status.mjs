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
    lifecycle: entry.lifecycle || null,
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
    lifecycleTracked: rows.filter((row) => row.lifecycle).length,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = buildLockboxStatus();
  const summary = summarizeLockboxStatus(rows);
  console.log(`Elara Lockbox — Pass ${manifest.pass}`);
  console.log(`Configured: ${summary.configured} | Missing: ${summary.missing} | Managed by runtime: ${summary.managedByRuntime} | Lifecycle tracked: ${summary.lifecycleTracked}`);
  console.log('');
  for (const row of rows) {
    const marker = row.status === 'configured' ? '✓' : row.status === 'missing' ? '✗' : '•';
    const rotation = row.lifecycle?.recommendedDays ? ` | rotate ~${row.lifecycle.recommendedDays}d` : '';
    console.log(`${marker} ${row.name} [${row.class}]${rotation}`);
  }
}
