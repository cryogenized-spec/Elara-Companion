import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');

test('Lockbox verification script never prints secret values', () => {
  const script = fs.readFileSync(path.join(root, 'scripts', 'lockbox-verify.mjs'), 'utf8');
  assert.equal(script.includes('process.env[entry.name]'), false);
  assert.equal(script.includes('JSON.stringify(process.env)'), false);
  assert.match(script, /live provider state requires privileged access/);
});

