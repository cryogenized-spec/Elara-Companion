import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('memory processor remains independent of browser projection and live thinking', async () => {
  const source = await readFile(fileURLToPath(new URL('./memoryProcessor.ts', import.meta.url)), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|document\.|window\./);
  assert.doesNotMatch(source, /recordLiveMemoryActivity|thinkingLiveRuntime/);
});
