import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('googleApi contains no local Keep archive implementation', async () => {
  const source = await readFile(fileURLToPath(new URL('./googleApi.ts', import.meta.url)), 'utf8');
  assert.doesNotMatch(source, /LOCAL_KEEP_ARCHIVE_KEY|function loadLocalKeepArchive|function saveLocalKeepArchive|export async function createKeepNote|export async function searchKeepNotes|export async function updateKeepNote|export async function getKeepNote|export async function deleteKeepNote/);
  assert.match(source, /from ['"]\.\.\/legacy\/googleKeepArchive['"]/);
});
