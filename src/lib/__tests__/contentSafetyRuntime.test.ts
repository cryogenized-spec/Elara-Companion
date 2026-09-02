import assert from 'node:assert/strict';
import test from 'node:test';
import { runResilientGeminiStreamTurn } from '../resilientGeminiStream';
import { ELARA_SAFETY_SETTINGS, buildRuntimeConfig } from '../../runtime/geminiRuntimeConfigService';

test('Chat runtime sends GenerateContent requests with Elara BLOCK_NONE settings and creative framing', async () => {
  let request: any;
  const ai = {
    models: {
      generateContentStream: async (input: any) => {
        request = input;
        return (async function* () {
          yield {
            text: 'Hello.',
            candidates: [{
              finishReason: 'STOP',
              content: { parts: [{ text: 'Hello.' }] },
            }],
          };
        })();
      },
    },
  } as any;

  const config = buildRuntimeConfig({
    model: 'gemini-3.7-flash',
    systemPrompt: 'You are Elara.',
  });

  await runResilientGeminiStreamTurn({
    ai,
    preferredModel: 'gemini-3.7-flash',
    buildConfig: () => config,
    contents: [{ role: 'user', parts: [{ text: 'Hello Elara.' }] }],
    onChunk: () => undefined,
    policy: {
      preferenceOrder: ['gemini-3.7-flash'],
      fallbackModels: [],
      failoverEnabled: false,
      retryPolicy: { maxAttempts: 1 },
    },
  });

  assert.equal(request.model, 'gemini-3.7-flash');
  assert.equal(request.config.safetySettings, ELARA_SAFETY_SETTINGS);
  assert.equal(request.config.systemInstruction.includes('[CREATIVE / ARTISTIC ROLEPLAY CONTEXT]'), true);
  assert.equal(request.config.systemInstruction.includes('fictional, creative-writing, artistic, and roleplay environment'), true);
});

test('Elara safety settings retain BLOCK_NONE for every configurable Gemini safety category', () => {
  assert.ok(Array.isArray(ELARA_SAFETY_SETTINGS));
  assert.equal(ELARA_SAFETY_SETTINGS.length, 4);
  for (const setting of ELARA_SAFETY_SETTINGS) {
    assert.equal(setting.threshold, 'BLOCK_NONE');
  }
});
