import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));

async function readText(path: string): Promise<string> {
  return readFile(join(root, path), 'utf8');
}

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(join(root, dir), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relative = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectSourceFiles(relative));
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) files.push(relative);
  }
  return files;
}

test('canonical Google authorization has exactly one implementation owner', async () => {
  const googleApi = await readText('src/lib/googleApi.ts');
  const authorization = await readText('src/lib/googleAuthorization.ts');

  assert.match(googleApi, /services\/googleWorkspaceService/);
  assert.doesNotMatch(googleApi, /let tokenClient\s*=|let accessToken\s*=|const SCOPES\s*=|initTokenClient\s*\(/);
  assert.match(authorization, /initTokenClient/);
  assert.match(authorization, /accessTokenExpiresAt/);
});

test('UI Google consumers use the feature-owned boundary', async () => {
  const files = await collectSourceFiles('src/components');
  const offenders: string[] = [];
  for (const file of files) {
    const source = await readText(file);
    if (source.includes("from '../lib/googleApi'") || source.includes('from "../lib/googleApi"')) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test('legacy Keep path contains no implementation', async () => {
  const source = await readText('src/legacy/googleKeepArchive.ts');
  assert.doesNotMatch(source, /localStorage\.setItem|localStorage\.getItem|LOCAL_REFERENCE_ARCHIVE_KEY|LOCAL_KEEP_ARCHIVE_KEY/);
  assert.match(source, /services\/referenceArchiveService/);
});

test('canonical reference archive owns historical Keep storage key deliberately', async () => {
  const source = await readText('src/services/referenceArchiveService.ts');
  assert.match(source, /elara_passive_keep_archive_v1/);
  assert.match(source, /createReferenceNote/);
  assert.match(source, /updateReferenceNote/);
});
