import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd());

async function readText(path: string): Promise<string> {
  return readFile(resolve(root, path), 'utf8');
}

test('production Chat server routes through the Interactions runtime boundary', async () => {
  const source = await readText('server/services/chatModelRuntime.ts');
  assert.match(source, /runResilientGeminiInteractionTurn/);
  assert.doesNotMatch(source, /from ['\"]\.\.\/\.\.\/src\/lib\/resilientGeminiStream['\"]/);
});

test('backend Chat route does not directly own Gemini GenerateContent transport', async () => {
  const source = await readText('server/routes/chat.ts');
  assert.doesNotMatch(source, /generateContent(Stream)?/);
  assert.doesNotMatch(source, /GoogleGenAI/);
});

test('legacy GenerateContent transport is not the backend runtime boundary', async () => {
  const source = await readText('server/services/chatModelRuntime.ts');
  assert.doesNotMatch(source, /runResilientGeminiStreamTurn\s*}\s*from ['\"]\.\.\/\.\.\/src\/lib\/resilientGeminiStream/);
});
