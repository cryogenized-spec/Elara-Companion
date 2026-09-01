import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGeminiToolHistory, validateGeminiToolHistory } from './resilientGeminiStream';

test('normalizes legacy tool-role contents to Gemini user function-response contents', () => {
  const contents: any[] = [
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

test('rejects the first current-turn Gemini 3 function call without a thought signature', () => {
  const malformed: any[] = [
    { role: 'user', parts: [{ text: 'do it' }] },
    { role: 'model', parts: [{ functionCall: { name: 'list_google_tasks', args: {}, id: 'call-1' } }] },
  ];

  assert.throws(
    () => validateGeminiToolHistory(malformed, 'gemini-3.7-flash'),
    (error: any) => error?.apiError?.code === 'INVALID_REQUEST_400' && error?.apiError?.retryable === false,
  );
});

test('accepts parallel Gemini 3 function calls when only the first call has the signature', () => {
  const contents: any[] = [
    { role: 'user', parts: [{ text: 'do both' }] },
    {
      role: 'model',
      parts: [
        { functionCall: { name: 'foo', args: {}, id: 'call-1' }, thoughtSignature: 'sig-1' },
        { functionCall: { name: 'bar', args: {}, id: 'call-2' } },
      ],
    },
    {
      role: 'user',
      parts: [
        { functionResponse: { name: 'foo', response: { ok: true }, id: 'call-1' } },
        { functionResponse: { name: 'bar', response: { ok: true }, id: 'call-2' } },
      ],
    },
  ];

  assert.doesNotThrow(() => validateGeminiToolHistory(contents, 'gemini-3.7-flash'));
});

test('requires signatures on each sequential Gemini 3 function-call model step', () => {
  const contents: any[] = [
    { role: 'user', parts: [{ text: 'do two steps' }] },
    { role: 'model', parts: [{ functionCall: { name: 'foo', args: {}, id: 'call-1' }, thoughtSignature: 'sig-1' }] },
    { role: 'user', parts: [{ functionResponse: { name: 'foo', response: { ok: true }, id: 'call-1' } }] },
    { role: 'model', parts: [{ functionCall: { name: 'bar', args: {}, id: 'call-2' } }] },
  ];

  assert.throws(
    () => validateGeminiToolHistory(contents, 'gemini-3.7-flash'),
    (error: any) => error?.apiError?.code === 'INVALID_REQUEST_400',
  );
});

test('rejects mismatched Gemini 3 function-response IDs', () => {
  const contents: any[] = [
    { role: 'user', parts: [{ text: 'do it' }] },
    { role: 'model', parts: [{ functionCall: { name: 'foo', args: {}, id: 'call-1' }, thoughtSignature: 'sig-1' }] },
    { role: 'user', parts: [{ functionResponse: { name: 'foo', response: { ok: true }, id: 'wrong-id' } }] },
  ];

  assert.throws(
    () => validateGeminiToolHistory(contents, 'gemini-3.7-flash'),
    (error: any) => error?.apiError?.code === 'INVALID_REQUEST_400',
  );
});

test('rejects Gemini 3 function calls without IDs', () => {
  const contents: any[] = [
    { role: 'user', parts: [{ text: 'do it' }] },
    { role: 'model', parts: [{ functionCall: { name: 'foo', args: {} }, thoughtSignature: 'sig-1' }] },
  ];

  assert.throws(
    () => validateGeminiToolHistory(contents, 'gemini-3.7-flash'),
    (error: any) => error?.apiError?.code === 'INVALID_REQUEST_400',
  );
});

test('ignores old invalid-looking Gemini 3 function-call history before the current turn', () => {
  const contents: any[] = [
    { role: 'user', parts: [{ text: 'old turn' }] },
    { role: 'model', parts: [{ functionCall: { name: 'old_tool', args: {}, id: 'old-call' } }] },
    { role: 'user', parts: [{ functionResponse: { name: 'old_tool', response: { ok: true }, id: 'old-call' } }] },
    { role: 'user', parts: [{ text: 'new turn' }] },
    { role: 'model', parts: [{ functionCall: { name: 'new_tool', args: {}, id: 'new-call' }, thoughtSignature: 'new-sig' }] },
  ];

  assert.doesNotThrow(() => validateGeminiToolHistory(contents, 'gemini-3.7-flash'));
});

test('accepts signed Gemini 3 function calls and does not impose validation on non-Gemini-3 models', () => {
  assert.doesNotThrow(() => validateGeminiToolHistory([
    { role: 'model', parts: [{ functionCall: { name: 'foo', args: {}, id: 'call-1' }, thoughtSignature: 'sig-2' }] },
  ], 'gemini-3.7-flash'));
  assert.doesNotThrow(() => validateGeminiToolHistory([
    { role: 'model', parts: [{ functionCall: { name: 'foo', args: {} } }] },
  ], 'gemini-2.5-flash'));
});
