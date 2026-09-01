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
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

test('Calendar REST requests are isolated to the infrastructure adapter', async () => {
  const files = await collectSourceFiles(join(root, 'src'));
  for (const file of files) {
    const relative = file.replace(`${root}/`, '');
    const source = await readFile(file, 'utf8');
    if (/calendar\/v3/.test(source)) {
      assert.equal(relative, 'src/infrastructure/googleCalendarApi.ts', `Direct Calendar REST usage found outside the canonical adapter: ${relative}`);
    }
  }
});

test('durable Calendar tools route through the canonical Calendar service', async () => {
  const source = await readFile(join(root, 'background-runtime/src/googleTools.ts'), 'utf8');
  assert.match(source, /from ['\"]\.\.\/\.\.\/src\/services\/googleCalendarService['\"]/);
  assert.doesNotMatch(source, /from ['\"]\.\.\/\.\.\/src\/infrastructure\/googleCalendarApi['\"]/);
});
