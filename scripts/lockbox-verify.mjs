import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config', 'lockbox.manifest.json'), 'utf8'));

const files = [
  '.env.example',
  '.github/workflows/deploy-google-auth.yml',
  '.github/workflows/deploy-background-runtime.yml',
  '.github/workflows/deploy.yml',
  '.github/workflows/automation.yml',
  'background-runtime/wrangler.toml',
  'background-runtime/wrangler.google-auth.toml',
  'server/services/gemini.ts',
  'server/services/lockbox.ts',
];

const contents = new Map();
for (const relative of files) {
  const full = path.join(root, relative);
  if (fs.existsSync(full)) contents.set(relative, fs.readFileSync(full, 'utf8'));
}

function evidenceFor(entry) {
  const matches = [];
  for (const [file, text] of contents) {
    if (text.includes(entry.name)) matches.push(file);
  }
  return matches;
}

function providerState(entry, evidence) {
  if (entry.exposure.includes('browser')) return evidence.length ? 'repository-verified' : 'unverified';
  if (entry.exposure.includes('ci')) return evidence.some((file) => file.startsWith('.github/workflows/')) ? 'provider-managed' : 'unverified';
  if (entry.exposure.includes('worker')) return evidence.some((file) => file.startsWith('background-runtime/')) ? 'provider-managed' : 'unverified';
  if (entry.exposure.includes('server')) return evidence.some((file) => file.startsWith('server/')) || evidence.includes('.env.example') ? 'repository-verified' : 'unverified';
  return evidence.length ? 'repository-verified' : 'unverified';
}

const rows = manifest.entries.map((entry) => {
  const evidence = evidenceFor(entry);
  return {
    name: entry.name,
    classification: entry.class,
    exposures: entry.exposure,
    lifecycle: entry.lifecycle ?? null,
    state: providerState(entry, evidence),
    evidence,
    note: entry.class.includes('SECRET') || entry.class.includes('PRIVATE')
      ? 'Value is never inspected; live provider state requires privileged access.'
      : undefined,
  };
});

const summary = {
  total: rows.length,
  repositoryVerified: rows.filter((row) => row.state === 'repository-verified').length,
  providerManaged: rows.filter((row) => row.state === 'provider-managed').length,
  unverified: rows.filter((row) => row.state === 'unverified').length,
};

console.log(JSON.stringify({ manifestPass: manifest.pass, verificationScope: 'repository-evidence-only', summary, entries: rows }, null, 2));
