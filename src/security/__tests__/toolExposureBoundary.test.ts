import assert from 'node:assert/strict';
import test from 'node:test';
import { buildConversationContents, buildRuntimeConfig } from '../../lib/chatRuntime';

function toolNames(config: any): string[] {
  return (config.tools?.[0]?.functionDeclarations || []).map((tool: any) => tool.name);
}

test('interactive chat without Google capability does not expose Google tools', () => {
  const config = buildRuntimeConfig({
    model: 'gemini-3.7-flash',
    toolExposure: {
      source: 'model',
      availableCapabilities: ['workspace.read', 'workspace.write'],
    },
  });

  const names = toolNames(config);
  assert.ok(names.includes('create_artifact'));
  assert.ok(!names.some((name) => name.includes('google')));
});

test('interactive chat with Google capability can see Google tools while execution policy remains separate', () => {
  const config = buildRuntimeConfig({
    model: 'gemini-3.7-flash',
    toolExposure: {
      source: 'model',
      availableCapabilities: ['workspace.read', 'workspace.write', 'google.read', 'google.write', 'google.auth'],
    },
  });

  const names = toolNames(config);
  assert.ok(names.some((name) => name.includes('google')));
  assert.ok(names.includes('disconnect_google_workspace'));
});

test('automation exposure hides external-write and authentication effects', () => {
  const config = buildRuntimeConfig({
    model: 'gemini-3.7-flash',
    toolExposure: {
      source: 'automation',
      availableCapabilities: ['workspace.read', 'workspace.write', 'google.read'],
      disallowedEffects: ['external-write', 'auth-change'],
    },
  });

  const names = toolNames(config);
  assert.ok(names.includes('read_google_doc'));
  assert.ok(!names.includes('create_google_doc'));
  assert.ok(!names.includes('disconnect_google_workspace'));
});

test('portrait/application state is not injected into model contents unless explicitly supplied as an image input', () => {
  const ordinaryContents = buildConversationContents([], 'Hello Elara');
  assert.equal(ordinaryContents.some((item) => item.parts?.some((part: any) => part.inlineData)), false);

  const explicitImage = 'data:image/png;base64,ZmFrZS1wb3J0cmFpdA==';
  const imageContents = buildConversationContents([], 'Hello Elara', explicitImage);
  assert.equal(imageContents.some((item) => item.parts?.some((part: any) => part.inlineData?.data === 'ZmFrZS1wb3J0cmFpdA==')), true);
});

test('tool exposure policy does not alter Gemini BLOCK_NONE safety settings', () => {
  const config = buildRuntimeConfig({
    model: 'gemini-3.7-flash',
    toolExposure: {
      source: 'automation',
      availableCapabilities: ['workspace.read'],
      disallowedEffects: ['external-write', 'auth-change'],
    },
  });

  assert.ok(Array.isArray(config.safetySettings));
  assert.equal(config.safetySettings.length, 6);
  for (const setting of config.safetySettings) {
    assert.equal(setting.threshold, 'BLOCK_NONE');
  }
  assert.ok(config.safetySettings.some((setting: any) => setting.category === 'HARM_CATEGORY_JAILBREAK'));
});
