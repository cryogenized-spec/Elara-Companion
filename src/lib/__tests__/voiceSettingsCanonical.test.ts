import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_VOICE_SETTINGS, migrateLegacyVoiceSettings, normalizeVoiceSettings } from '../voiceSettings';

test('canonical voiceSettings wins over legacy flat speech fields', () => {
  const settings = migrateLegacyVoiceSettings({
    voiceSettings: {
      language: 'en-ZA',
      autoSendOnSilence: true,
      autoCapitalize: false,
      silenceTimeoutMs: 4000,
    },
    speechLanguage: 'en-US',
    speechAutoSend: false,
    speechAutoCapitalize: true,
    speechPauseTimeout: 1000,
  });

  assert.equal(settings.language, 'en-ZA');
  assert.equal(settings.autoSendOnSilence, true);
  assert.equal(settings.autoCapitalize, false);
  assert.equal(settings.silenceTimeoutMs, 4000);
});

test('missing voice settings still normalize to the canonical defaults', () => {
  assert.deepEqual(normalizeVoiceSettings(undefined), DEFAULT_VOICE_SETTINGS);
});
