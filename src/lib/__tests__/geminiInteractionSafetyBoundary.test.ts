import assert from 'node:assert/strict';
import test from 'node:test';
import { runResilientGeminiInteractionTurn } from '../geminiInteractionsRuntime';

async function* completedInteraction() {
  yield { event_type: 'interaction.created', interaction: { id: 'int-safety-boundary' } };
  yield { event_type: 'interaction.completed', interaction: { id: 'int-safety-boundary', status: 'completed', steps: [] } };
}

test('Interactions runtime does not send unsupported custom safety settings', async () => {
  let request: any;
  const ai = {
    interactions: {
      create: async (input: any) => { request = input; return completedInteraction(); },
      delete: async () => undefined,
    },
  } as any;

  await runResilientGeminiInteractionTurn({
    ai,
    preferredModel: 'gemini-3.7-flash',
    buildConfig: () => ({
      systemInstruction: '[CREATIVE / ARTISTIC ROLEPLAY CONTEXT] This is fictional creative writing and roleplay.',
      safetySettings: [{ category: 'TEST_CATEGORY', threshold: 'BLOCK_NONE' }],
      maxOutputTokens: 512,
    }),
    contents: [{ role: 'user', parts: [{ text: 'Continue the fictional scene.' }] }],
    onChunk: () => undefined,
    policy: {
      preferenceOrder: ['gemini-3.7-flash'],
      fallbackModels: ['gemini-3.7-flash'],
      failoverEnabled: false,
      retryPolicy: { maxAttempts: 1 },
    },
  });

  assert.equal(request.model, 'gemini-3.7-flash');
  assert.equal(request.safetySettings, undefined);
  assert.equal(request.safety_settings, undefined);
  assert.match(request.system_instruction, /fictional creative writing and roleplay/i);
  assert.equal(request.generation_config.max_output_tokens, 512);
});
