import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeResilienceDiagnosticEvent } from './resilienceDiagnostics';

test('Pass 1 forensic diagnostics retain request-shape and provider-failure metadata without exposing secrets', () => {
  const event = sanitizeResilienceDiagnosticEvent({
    kind: 'ERROR',
    provider: 'google',
    actualModel: 'gemini-3.6-flash',
    phase: 'continuation',
    contentsCount: 4,
    totalPartCount: 9,
    modelPartCount: 3,
    functionCallCount: 1,
    functionResponseCount: 1,
    functionCallIdsPresent: 1,
    thoughtSignaturesPresent: 1,
    toolDeclarationCount: 12,
    countedInputTokens: 18742,
    providerErrorMessage: 'HTTP 400: bad request. authorization: Bearer SECRET apiKey=SUPERSECRET',
    tokenCountError: 'HTTP 400: token count unavailable',
  });

  assert.equal(event.phase, 'continuation');
  assert.equal(event.contentsCount, 4);
  assert.equal(event.totalPartCount, 9);
  assert.equal(event.functionCallCount, 1);
  assert.equal(event.functionResponseCount, 1);
  assert.equal(event.functionCallIdsPresent, 1);
  assert.equal(event.thoughtSignaturesPresent, 1);
  assert.equal(event.toolDeclarationCount, 12);
  assert.equal(event.countedInputTokens, 18742);
  assert.match(event.providerErrorMessage || '', /authorization: \[redacted\]/i);
  assert.match(event.providerErrorMessage || '', /apiKey=\[redacted\]/i);
});
