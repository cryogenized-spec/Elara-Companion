import assert from 'node:assert/strict';
import test from 'node:test';
import { runResilientGeminiInteractionTurn } from '../geminiInteractionsRuntime';

async function* completedStream() {
  yield { event_type: 'interaction.created', interaction: { id: 'interaction-shape-test' } };
  yield { event_type: 'interaction.completed', interaction: {
    id: 'interaction-shape-test',
    status: 'completed',
    steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Done.' }] }],
  } };
}

test('Interactions runtime sends the selected model and provider-native generation settings', async () => {
  const requests: any[] = [];
  const ai = {
    interactions: {
      create: async (request: any) => { requests.push(request); return completedStream(); },
      delete: async () => undefined,
    },
  } as any;

  const result = await runResilientGeminiInteractionTurn({
    ai,
    preferredModel: 'gemini-3.6-flash',
    buildConfig: () => ({
      systemInstruction: 'You are Elara.',
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingLevel: 'medium', includeThoughts: true },
      safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }],
      tools: [{ functionDeclarations: [{
        name: 'list_google_tasks',
        description: 'List pending Google Tasks.',
        parametersJsonSchema: { type: 'object', properties: {} },
      }] }],
    }),
    contents: [{ role: 'user', parts: [{ text: 'List my pending Google Tasks.' }] }],
    onChunk: () => undefined,
    policy: {
      failoverEnabled: false,
      retryPolicy: { maxAttempts: 1 },
      preferenceOrder: ['gemini-3.6-flash'],
      fallbackModels: [],
    },
  });

  const request = requests[0];
  assert.equal(result.model, 'gemini-3.6-flash');
  assert.equal(request.model, 'gemini-3.6-flash');
  assert.equal(request.generation_config.max_output_tokens, 4096);
  assert.equal(request.generation_config.thinking_level, 'medium');
  assert.equal(request.generation_config.thinking_summaries, 'auto');
  assert.equal(request.generation_config.thinkingConfig, undefined);
  assert.equal(request.maxOutputTokens, undefined);
  assert.equal(request.thinkingConfig, undefined);
  assert.equal(request.safetySettings, undefined);
  assert.equal(request.safety_settings, undefined);
  assert.equal(request.tools[0].type, 'function');
  assert.equal(request.tools[0].name, 'list_google_tasks');
});
