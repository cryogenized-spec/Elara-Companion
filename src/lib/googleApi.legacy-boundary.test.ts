import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));

async function readSource(relativePath: string): Promise<string> {
  return readFile(join(root, relativePath), 'utf8');
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

test('googleApi is compatibility-only and has no independent OAuth authority', async () => {
  const source = await readSource('src/lib/googleApi.ts');
  assert.match(source, /services\/googleWorkspaceService/);
  assert.doesNotMatch(source, /let tokenClient\s*=|let accessToken\s*=|const SCOPES\s*=|initTokenClient\s*\(/);
  assert.doesNotMatch(source, /fetch\(['\"]https:\/\/oauth2\.googleapis\.com\/revoke/);
});

test('reference archive owns the historical local Keep storage', async () => {
  const source = await readSource('src/services/referenceArchiveService.ts');
  assert.match(source, /elara_passive_keep_archive_v1/);
  assert.match(source, /createReferenceNote/);
  assert.match(source, /updateReferenceNote/);
});

test('deleted legacy Keep implementation remains absent', async () => {
  assert.equal(existsSync(join(root, 'src/legacy/googleKeepArchive.ts')), false);
});

test('no production source imports the deleted legacy Keep module', async () => {
  const sourceFiles = await collectSourceFiles('src');
  const offenders: string[] = [];
  for (const file of sourceFiles) {
    const source = await readFile(join(root, file), 'utf8');
    if (source.includes('legacy/googleKeepArchive')) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test('Workspace tools use canonical Google and reference-archive services directly', async () => {
  const source = await readSource('src/lib/workspaceTools.ts');
  assert.doesNotMatch(source, /from ['\"]\.\/googleApi['\"]/);
  assert.doesNotMatch(source, /legacy\/googleKeepArchive/);
  assert.match(source, /services\/googleDocsDriveService/);
  assert.match(source, /services\/googleWorkspaceService/);
  assert.match(source, /services\/referenceArchiveService/);
});
