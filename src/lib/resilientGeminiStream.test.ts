import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGeminiToolHistory, validateGeminiToolHistory } from './resilientGeminiStream';

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

test('rejects reconstructed Gemini 3 function calls without a thought signature', () => {
  const malformed = [
    { role: 'user', parts: [{ text: 'do it' }] },
    { role: 'model', parts: [{ functionCall: { name: 'list_google_tasks', args: {} } }] },
  ];

  assert.throws(
    () => validateGeminiToolHistory(malformed, 'gemini-3.7-flash'),
    (error: any) => error?.apiError?.code === 'INVALID_REQUEST_400' && error?.apiError?.retryable === false,
  );
});

test('accepts signed Gemini 3 function calls and does not impose validation on non-Gemini-3 models', () => {
  assert.doesNotThrow(() => validateGeminiToolHistory([
    { role: 'model', parts: [{ functionCall: { name: 'foo', args: {} }, thoughtSignature: 'sig-2' }] },
  ], 'gemini-3.7-flash'));
  assert.doesNotThrow(() => validateGeminiToolHistory([
    { role: 'model', parts: [{ functionCall: { name: 'foo', args: {} } }] },
  ], 'gemini-2.5-flash'));
});
