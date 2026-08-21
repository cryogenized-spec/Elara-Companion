import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_RUNTIME_RULES } from './defaultPrompt';

test('Elara runtime rules preserve the Markdown-first lightweight presentation policy', () => {
  assert.match(DEFAULT_RUNTIME_RULES, /Markdown is Elara's normal lightweight presentation language in chat/);
  assert.match(DEFAULT_RUNTIME_RULES, /small Markdown tables/);
  assert.match(DEFAULT_RUNTIME_RULES, /bullet lists/);
  assert.match(DEFAULT_RUNTIME_RULES, /Canvas, Workspace artifacts/);
  assert.match(DEFAULT_RUNTIME_RULES, /Keep headings modest/);
  assert.match(DEFAULT_RUNTIME_RULES, /single-asterisk italics/);
});
