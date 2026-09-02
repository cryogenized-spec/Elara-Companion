import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      files.push(...await collectSourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

test('Calendar REST requests are isolated to infrastructure adapters', async () => {
  const allowed = new Set(['src/infrastructure/googleCalendarApi.ts', 'src/infrastructure/googleCalendarWatchApi.ts']);
  const files = await collectSourceFiles(join(root, 'src'));
  for (const file of files) {
    const relative = file.replace(`${root}/`, '');
    if (/\.test\.[tj]sx?$/.test(relative) || relative.includes('/__tests__/')) continue;
    const source = await readFile(file, 'utf8');
    if (/calendar\/v3/.test(source)) assert.ok(allowed.has(relative), `Direct Calendar REST usage found outside approved infrastructure adapters: ${relative}`);
  }
});

test('durable Calendar tools route through the canonical Calendar service', async () => {
  const source = await readFile(join(root, 'background-runtime/src/googleTools.ts'), 'utf8');
  assert.match(source, /from ['\"]\.\.\/\.\.\/src\/services\/googleCalendarService['\"]/);
  assert.doesNotMatch(source, /from ['\"]\.\.\/\.\.\/src\/infrastructure\/googleCalendarApi['\"]/);
});
