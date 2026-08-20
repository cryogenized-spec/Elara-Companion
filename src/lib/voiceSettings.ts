export const VOICE_DEFAULT_SILENCE_TIMEOUT_MS = 2500;
export const VOICE_MIN_SILENCE_TIMEOUT_MS = 500;
export const VOICE_MAX_SILENCE_TIMEOUT_MS = 10000;

export interface VoiceSettings {
  language: string;
  autoSendOnSilence: boolean;
  autoCapitalize: boolean;
  silenceTimeoutMs: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  language: 'en-US',
  autoSendOnSilence: false,
  autoCapitalize: true,
  silenceTimeoutMs: VOICE_DEFAULT_SILENCE_TIMEOUT_MS,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
};

export function clampVoiceSilenceTimeout(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return VOICE_DEFAULT_SILENCE_TIMEOUT_MS;
  return Math.min(
    VOICE_MAX_SILENCE_TIMEOUT_MS,
    Math.max(VOICE_MIN_SILENCE_TIMEOUT_MS, Math.round(numeric)),
  );
}

export function normalizeVoiceSettings(value?: Partial<VoiceSettings> | null): VoiceSettings {
  return {
    ...DEFAULT_VOICE_SETTINGS,
    ...(value || {}),
    language:
      typeof value?.language === 'string' && value.language.trim()
        ? value.language.trim()
        : DEFAULT_VOICE_SETTINGS.language,
    autoSendOnSilence:
      typeof value?.autoSendOnSilence === 'boolean'
        ? value.autoSendOnSilence
        : DEFAULT_VOICE_SETTINGS.autoSendOnSilence,
    autoCapitalize:
      typeof value?.autoCapitalize === 'boolean'
        ? value.autoCapitalize
        : DEFAULT_VOICE_SETTINGS.autoCapitalize,
    silenceTimeoutMs: clampVoiceSilenceTimeout(value?.silenceTimeoutMs),
    noiseSuppression:
      typeof value?.noiseSuppression === 'boolean'
        ? value.noiseSuppression
        : DEFAULT_VOICE_SETTINGS.noiseSuppression,
    echoCancellation:
      typeof value?.echoCancellation === 'boolean'
        ? value.echoCancellation
        : DEFAULT_VOICE_SETTINGS.echoCancellation,
    autoGainControl:
      typeof value?.autoGainControl === 'boolean'
        ? value.autoGainControl
        : DEFAULT_VOICE_SETTINGS.autoGainControl,
  };
}

/** Bridges pre-Pass-2 flat speech fields into the canonical settings model. */
export function migrateLegacyVoiceSettings(source: {
  voiceSettings?: Partial<VoiceSettings>;
  speechLanguage?: string;
  speechAutoSend?: boolean;
  speechAutoCapitalize?: boolean;
  speechPauseTimeout?: number;
}): VoiceSettings {
  return normalizeVoiceSettings({
    ...(source.voiceSettings || {}),
    language: source.voiceSettings?.language ?? source.speechLanguage,
    autoSendOnSilence: source.voiceSettings?.autoSendOnSilence ?? source.speechAutoSend,
    autoCapitalize: source.voiceSettings?.autoCapitalize ?? source.speechAutoCapitalize,
    silenceTimeoutMs: source.voiceSettings?.silenceTimeoutMs ?? source.speechPauseTimeout,
  });
}
