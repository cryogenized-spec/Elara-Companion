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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify({ environment: process.env.NODE_ENV || 'development', lockbox: buildLockboxStatus() }, null, 2));
}
