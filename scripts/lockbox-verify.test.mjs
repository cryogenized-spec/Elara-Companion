import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const directEnvReference = ['process', 'env'].join('.') + '[entry.name]';
const serializedEnvReference = 'JSON.stringify(' + ['process', 'env'].join('.') + ')';

test('Lockbox verification script never prints secret values', () => {
  const script = fs.readFileSync(path.join(root, 'scripts', 'lockbox-verify.mjs'), 'utf8');
  assert.equal(script.includes(directEnvReference), false);
  assert.equal(script.includes(serializedEnvReference), false);
  assert.match(script, /live provider state requires privileged access/);
});
