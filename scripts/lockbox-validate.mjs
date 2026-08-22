import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'config', 'lockbox.manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const validClasses = new Set([
  'CRITICAL_SECRET', 'INFRA_SECRET', 'PUBLIC_CONFIG', 'PRIVATE_CONFIG',
  'INFRA_CONFIG', 'JOB_INPUT', 'RUNTIME_METADATA', 'PRIVATE_BINDING', 'RUNTIME_CONFIG',
]);
const validExposures = new Set(['browser', 'server', 'worker', 'ci']);
const validRotationModes = new Set(['manual', 'automatable', 'runtime-managed', 'not-applicable']);
const seen = new Set();
const errors = [];

if (manifest?.name !== 'elara-lockbox') errors.push('manifest.name must be elara-lockbox');
if (!Number.isInteger(manifest?.pass) || manifest.pass < 1) errors.push('manifest.pass must be a positive integer');
if (!Array.isArray(manifest?.entries) || manifest.entries.length === 0) errors.push('manifest.entries must be a non-empty array');

for (const entry of manifest.entries || []) {
  if (!entry?.name || typeof entry.name !== 'string') errors.push('entry.name must be a non-empty string');
  if (seen.has(entry.name)) errors.push(`duplicate key: ${entry.name}`);
  seen.add(entry.name);
  if (!validClasses.has(entry.class)) errors.push(`invalid class for ${entry.name}: ${entry.class}`);
  if (!Array.isArray(entry.exposure) || entry.exposure.length === 0) errors.push(`missing exposure for ${entry.name}`);
  for (const exposure of entry.exposure || []) {
    if (!validExposures.has(exposure)) errors.push(`invalid exposure for ${entry.name}: ${exposure}`);
  }
  if (entry.class?.includes('SECRET') && entry.exposure?.includes('browser')) {
    errors.push(`secret ${entry.name} cannot be browser-exposed`);
  }

  if (entry.lifecycle) {
    if (typeof entry.lifecycle.owner !== 'string' || !entry.lifecycle.owner.trim()) {
      errors.push(`lifecycle.owner missing for ${entry.name}`);
    }
    if (!validRotationModes.has(entry.lifecycle.rotationMode)) {
      errors.push(`invalid lifecycle.rotationMode for ${entry.name}: ${entry.lifecycle.rotationMode}`);
    }
    if (entry.lifecycle.recommendedDays !== undefined &&
        (!Number.isInteger(entry.lifecycle.recommendedDays) || entry.lifecycle.recommendedDays <= 0)) {
      errors.push(`lifecycle.recommendedDays must be a positive integer for ${entry.name}`);
    }
    if (typeof entry.lifecycle.expiryRequired !== 'boolean') {
      errors.push(`lifecycle.expiryRequired must be boolean for ${entry.name}`);
    }
  }

  if (entry.class === 'CRITICAL_SECRET') {
    if (!entry.lifecycle) errors.push(`critical secret ${entry.name} requires lifecycle metadata`);
    if (entry.lifecycle?.rotationMode === 'not-applicable') {
      errors.push(`critical secret ${entry.name} cannot use rotationMode not-applicable`);
    }
    if (entry.lifecycle?.expiryRequired === true && !entry.lifecycle?.recommendedDays) {
      errors.push(`expiring critical secret ${entry.name} requires recommendedDays`);
    }
  }
}

if (errors.length) {
  console.error('Lockbox manifest validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Lockbox manifest valid: ${manifest.entries.length} entries, pass ${manifest.pass}.`);
