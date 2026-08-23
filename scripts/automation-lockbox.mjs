import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(directory, '../config/lockbox.manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function entryFor(name) {
  const entry = manifest.entries?.find((candidate) => candidate?.name === name);
  if (!entry) throw new Error(`Unknown Lockbox key: ${name}`);
  return entry;
}

function assertAutomationEntry(name) {
  const entry = entryFor(name);
  if (!Array.isArray(entry.exposure) || !entry.exposure.includes('ci')) {
    throw new Error(`Lockbox key ${name} is not approved for CI exposure.`);
  }
  return entry;
}

function readValue(env, name, required) {
  assertAutomationEntry(name);
  const raw = env[name];
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (required && !value) throw new Error(`Required Lockbox value ${name} is not configured.`);
  return value || undefined;
}

export function createAutomationLockbox(env = process.env) {
  return {
    secret(name) {
      const entry = assertAutomationEntry(name);
      if (!['CRITICAL_SECRET', 'INFRA_SECRET'].includes(entry.class)) {
        throw new Error(`Lockbox key ${name} is not classified as a CI secret.`);
      }
      return readValue(env, name, true);
    },
    optionalSecret(name) {
      const entry = assertAutomationEntry(name);
      if (!['CRITICAL_SECRET', 'INFRA_SECRET'].includes(entry.class)) {
        throw new Error(`Lockbox key ${name} is not classified as a CI secret.`);
      }
      return readValue(env, name, false);
    },
    config(name) {
      const entry = assertAutomationEntry(name);
      if (!['PUBLIC_CONFIG', 'PRIVATE_CONFIG', 'INFRA_CONFIG', 'JOB_INPUT', 'RUNTIME_METADATA'].includes(entry.class)) {
        throw new Error(`Lockbox key ${name} is not classified as CI configuration.`);
      }
      return readValue(env, name, false);
    },
    requireConfig(name) {
      const value = this.config(name);
      if (!value) throw new Error(`Required Lockbox configuration ${name} is not configured. Set it in the GitHub Actions repository variable/environment for CI, or in a local .env file for direct development runs.`);
      return value;
    },
  };
}
