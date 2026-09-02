import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeModelName } from '../../../server/services/gemini';
import { runResilientGeminiInteractionTurn } from '../geminiInteractionsRuntime';

async function* completedInteraction() {
  yield { event_type: 'interaction.created', interaction: { id: 'int-safety-boundary' } };
  yield {
    event_type: 'interaction.completed',
    interaction: {
      id: 'int-safety-boundary',
      status: 'completed',
      steps: [],
    },
  };
}

test('Gemini 3.7 remains the requested runtime model and is not rewritten to 3.6', () => {
  assert.equal(normalizeModelName('gemini-3.7-flash'), 'gemini-3.7-flash');
  assert.equal(normalizeModelName('gemini-flash-latest'), 'gemini-3.7-flash');
});

test('Interactions runtime strips unsupported custom safety settings from provider requests', async () => {
  let request: any;
  const ai = {
    interactions: {
      create: async (input: any) => {
        request = input;
        return completedInteraction();
      },
      delete: async () => undefined,
    },
  } as any;

  await runResilientGeminiInteractionTurn({
    ai,
    preferredModel: 'gemini-3.7-flash',
    buildConfig: () => ({
      systemInstruction: '[CREATIVE / ARTISTIC ROLEPLAY CONTEXT] This is fictional creative writing and roleplay.',
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
      maxOutputTokens: 512,
    }),
    contents: [{ role: 'user', parts: [{ text: 'List my pending tasks.' }] }],
    onChunk: () => undefined,
    policy: {
      preferenceOrder: ['gemini-3.7-flash'],
      fallbackModels: ['gemini-3.7-flash'],
      failoverEnabled: false,
      retryPolicy: { maxAttempts: 1 },
    },
    requestId: 'safety-boundary-test',
  });

  assert.equal(request.model, 'gemini-3.7-flash');
  assert.equal(request.safety_settings, undefined);
  assert.equal(request.system_instruction.includes('fictional creative writing and roleplay'), true);
  assert.equal(request.generation_config.max_output_tokens, 512);
});
