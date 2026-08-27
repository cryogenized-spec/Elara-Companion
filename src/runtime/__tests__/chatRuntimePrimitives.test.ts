import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  buildConversationContents,
  MAX_AGENT_ITERATIONS,
  parseRuntimeDataUrl,
} from '../chatRuntimePrimitives';
import {
  buildRuntimeConfig,
  deriveThinkingLevel,
  normalizeModel,
} from '../geminiRuntimeConfigService';

test('canonical runtime normalizes model names and thinking levels consistently', () => {
  assert.equal(normalizeModel('models/gemini-3.7-flash'), 'gemini-3.7-flash');
  assert.equal(deriveThinkingLevel(undefined, 0), 'minimal');
  assert.equal(deriveThinkingLevel(undefined, 2048), 'low');
  assert.equal(deriveThinkingLevel(undefined, 4096), 'medium');
  assert.equal(deriveThinkingLevel(undefined, 8192), 'high');
  assert.equal(MAX_AGENT_ITERATIONS, 5);
});

test('canonical runtime parses data URLs without server dependencies', () => {
  assert.deepEqual(parseRuntimeDataUrl('data:image/png;base64,AAAA'), { mimeType: 'image/png', data: 'AAAA' });
  assert.equal(parseRuntimeDataUrl('not-a-data-url'), null);
});

test('canonical runtime constructs the same multimodal content contract for history and current input', () => {
  const contents = buildConversationContents(
    [{ role: 'user', content: 'previous', image: 'data:image/png;base64,AAAA' }],
    'current',
    'data:image/jpeg;base64,BBBB',
  );

  assert.equal(contents.length, 2);
  assert.equal(contents[0].role, 'user');
  assert.equal(contents[0].parts[0].inlineData.mimeType, 'image/png');
  assert.equal(contents[0].parts[1].text, 'previous');
  assert.equal(contents[1].parts[0].inlineData.mimeType, 'image/jpeg');
  assert.equal(contents[1].parts[1].text, 'current');
});

test('canonical runtime provides one tool-bearing model configuration contract', () => {
  const config = buildRuntimeConfig({ model: 'gemini-3.7-flash', systemPrompt: 'test' });
  assert.equal(Array.isArray(config.tools), true);
  assert.equal(config.tools.length, 1);
  assert.equal(Array.isArray(config.tools[0].functionDeclarations), true);
  assert.ok(config.systemInstruction.includes('test'));
});
