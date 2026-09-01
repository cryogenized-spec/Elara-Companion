import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGeminiToolHistory } from './resilientGeminiStream';

test('normalizes legacy tool-role contents to Gemini user function-response contents', () => {
  const contents = [
    { role: 'user', parts: [{ text: 'run my tasks' }] },
    { role: 'model', parts: [{ functionCall: { name: 'list_google_tasks', args: {}, id: 'call-1' }, thoughtSignature: 'sig-1' }] },
    { role: 'tool', parts: [{ functionResponse: { name: 'list_google_tasks', response: { ok: true }, id: 'call-1' } }] },
  ];

  const normalized = normalizeGeminiToolHistory(contents);

  assert.strictEqual(normalized, contents);
  assert.equal(normalized[2].role, 'user');
  assert.deepEqual(normalized[2].parts[0].functionResponse, {
    name: 'list_google_tasks',
    response: { ok: true },
    id: 'call-1',
  });
  assert.equal(normalized[1].parts[0].thoughtSignature, 'sig-1');
});

test('leaves ordinary user and model history untouched', () => {
  const contents = [
    { role: 'user', parts: [{ text: 'hello' }] },
    { role: 'model', parts: [{ text: 'hi' }] },
  ];

  normalizeGeminiToolHistory(contents);
  assert.deepEqual(contents, [
    { role: 'user', parts: [{ text: 'hello' }] },
    { role: 'model', parts: [{ text: 'hi' }] },
  ]);
});
