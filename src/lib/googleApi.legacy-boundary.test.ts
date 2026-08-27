import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('googleApi has no local Keep archive implementation or legacy Keep dependency', async () => {
  const source = await readFile(fileURLToPath(new URL('./googleApi.ts', import.meta.url)), 'utf8');
  assert.doesNotMatch(source, /LOCAL_KEEP_ARCHIVE_KEY|function loadLocalKeepArchive|function saveLocalKeepArchive|export async function createKeepNote|export async function searchKeepNotes|export async function updateKeepNote|export async function getKeepNote|export async function deleteKeepNote/);
  assert.doesNotMatch(source, /legacy\/googleKeepArchive/);
});

test('legacy Google Keep module is only a compatibility shim', async () => {
  const source = await readFile(fileURLToPath(new URL('../legacy/googleKeepArchive.ts', import.meta.url)), 'utf8');
  assert.doesNotMatch(source, /LOCAL_KEEP_ARCHIVE_KEY|localStorage\.setItem|localStorage\.getItem/);
  assert.match(source, /services\/referenceArchiveService/);
});
