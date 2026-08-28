import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

async function readSource(fileName: string): Promise<string> {
  return readFile(path.join(here, fileName), 'utf8');
}

test('Pass 21 model selector is hosted immediately before M↓ in the composer toolbar', async () => {
  const source = await readSource('ComposerMarkdownAnchor.tsx');
  const selectorIndex = source.indexOf('<ChatModelSelector />');
  const markdownIndex = source.indexOf('<MarkdownHelpButton inline />');

  assert.ok(selectorIndex >= 0, 'ChatModelSelector must be rendered in the composer toolbar');
  assert.ok(markdownIndex >= 0, 'MarkdownHelpButton must remain available');
  assert.ok(selectorIndex < markdownIndex, 'Model selector must be placed to the left of M↓');
});

test('Pass 21 selector implements an upward menu with keyboard and outside-click dismissal', async () => {
  const source = await readSource('ChatModelSelector.tsx');
  assert.match(source, /bottom-full/);
  assert.match(source, /role="menu"/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /mousedown/);
});

test('Pass 21 selector persists the selected model through the canonical settings store', async () => {
  const source = await readSource('ChatModelSelector.tsx');
  assert.match(source, /getDbSettings/);
  assert.match(source, /setDbSettings/);
  assert.match(source, /preferredModelOrder/);
  assert.match(source, /model: modelId/);
  assert.match(source, /elara-settings-changed/);
});

test('Pass 21 selector does not modify fallbackModels while changing selected preference', async () => {
  const source = await readSource('ChatModelSelector.tsx');
  const selectionBlock = source.slice(source.indexOf('const selectModel'), source.indexOf('const selectedLabel'));
  assert.doesNotMatch(selectionBlock, /fallbackModels/);
  assert.match(selectionBlock, /preferredModelOrder/);
});
