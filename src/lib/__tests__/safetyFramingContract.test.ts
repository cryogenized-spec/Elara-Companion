import assert from 'node:assert/strict';
import test from 'node:test';
import { HarmCategory, HarmBlockThreshold } from '@google/genai';
import { ELARA_SAFETY_SETTINGS } from '../../runtime/geminiRuntimeConfigService';

const configurableCategories = new Set([
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
]);

test('ELARA safety settings only contain Gemini API-supported configurable categories', () => {
  assert.equal(ELARA_SAFETY_SETTINGS.every((setting) => configurableCategories.has(setting.category)), true);
  assert.equal(ELARA_SAFETY_SETTINGS.every((setting) => setting.threshold === HarmBlockThreshold.BLOCK_NONE), true);
});

test('jailbreak is not represented as a configurable Gemini API safety setting', () => {
  assert.equal(ELARA_SAFETY_SETTINGS.some((setting) => setting.category === HarmCategory.HARM_CATEGORY_JAILBREAK), false);
});
