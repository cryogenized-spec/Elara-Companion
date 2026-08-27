import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('googleApi remains a compatibility facade without the removed local Keep archive', async () => {
  const source = await readFile(fileURLToPath(new URL('./googleApi.ts', import.meta.url)), 'utf8');
  assert.doesNotMatch(source, /loadLocalKeepArchive|saveLocalKeepArchive|createKeepNote|searchKeepNotes|listKeepNotes|copyCanvasToKeep/);
  assert.doesNotMatch(source, /elara_passive_keep_archive_v1/);
});
