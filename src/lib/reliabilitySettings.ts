import type { ElaraApiErrorCode } from './apiError';
import type { RetryPolicy } from './retryPolicy';

export const RELIABILITY_FALLBACK_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
] as const;

export interface ReliabilitySettings {
  autoRetryEnabled: boolean;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
  honorRetryAfter: boolean;
  autoFailoverEnabled: boolean;
  fallbackModels: string[];
  cooldownMs: number;
  autoRestorePreferredModel: boolean;
  retryableErrorCodes: ElaraApiErrorCode[];
  failoverErrorCodes: ElaraApiErrorCode[];
}

export const DEFAULT_RELIABILITY_SETTINGS: ReliabilitySettings = {
  autoRetryEnabled: true,
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterRatio: 0.2,
  honorRetryAfter: true,
  autoFailoverEnabled: true,
  fallbackModels: [...RELIABILITY_FALLBACK_MODELS],
  cooldownMs: 60_000,
  autoRestorePreferredModel: true,
  retryableErrorCodes: [
    'API_RATE_LIMIT_RPM_429',
    'REQUEST_TIMEOUT_408',
    'SERVER_ERROR_500',
    'BAD_GATEWAY_502',
    'SERVICE_UNAVAILABLE_503',
    'GATEWAY_TIMEOUT_504',
    'NETWORK_ERROR',
    'UNKNOWN_API_ERROR',
  ],
  failoverErrorCodes: [
    'API_RATE_LIMIT_RPM_429',
    'API_QUOTA_DAILY_429',
    'MODEL_NOT_FOUND_404',
    'SERVER_ERROR_500',
    'BAD_GATEWAY_502',
    'SERVICE_UNAVAILABLE_503',
    'GATEWAY_TIMEOUT_504',
    'UNKNOWN_API_ERROR',
  ],
};

const AVAILABLE_FALLBACKS = new Set<string>(RELIABILITY_FALLBACK_MODELS);

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.floor(numeric)));
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeModelList(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_RELIABILITY_SETTINGS.fallbackModels];
  const normalized = value
    .filter((model): model is string => typeof model === 'string')
    .map((model) => model.trim().toLowerCase())
    .filter((model) => AVAILABLE_FALLBACKS.has(model));
  return [...new Set(normalized)];
}

function normalizeErrorCodes(value: unknown, fallback: ElaraApiErrorCode[]): ElaraApiErrorCode[] {
  if (!Array.isArray(value)) return [...fallback];
  return [...new Set(value.filter((code): code is ElaraApiErrorCode => typeof code === 'string'))];
}

export function normalizeReliabilitySettings(value: Partial<ReliabilitySettings> | null | undefined): ReliabilitySettings {
  const raw = value || {};
  const retryableErrorCodes = normalizeErrorCodes(raw.retryableErrorCodes, DEFAULT_RELIABILITY_SETTINGS.retryableErrorCodes);
  const failoverErrorCodes = normalizeErrorCodes(raw.failoverErrorCodes, DEFAULT_RELIABILITY_SETTINGS.failoverErrorCodes);

  // An unclassified provider/SDK failure is still an eligible resilience event.
  // Keep unknown failures recoverable for existing stored reliability settings,
  // while more specific auth/safety/validation/context errors remain excluded.
  if (!retryableErrorCodes.includes('UNKNOWN_API_ERROR')) retryableErrorCodes.push('UNKNOWN_API_ERROR');
  if (!failoverErrorCodes.includes('UNKNOWN_API_ERROR')) failoverErrorCodes.push('UNKNOWN_API_ERROR');

  return {
    autoRetryEnabled: typeof raw.autoRetryEnabled === 'boolean' ? raw.autoRetryEnabled : DEFAULT_RELIABILITY_SETTINGS.autoRetryEnabled,
    maxAttempts: clampInt(raw.maxAttempts, DEFAULT_RELIABILITY_SETTINGS.maxAttempts, 1, 5),
    baseDelayMs: clampInt(raw.baseDelayMs, DEFAULT_RELIABILITY_SETTINGS.baseDelayMs, 0, 10000),
    maxDelayMs: clampInt(raw.maxDelayMs, DEFAULT_RELIABILITY_SETTINGS.maxDelayMs, 0, 120000),
    jitterRatio: clampNumber(raw.jitterRatio, DEFAULT_RELIABILITY_SETTINGS.jitterRatio, 0, 1),
    honorRetryAfter: typeof raw.honorRetryAfter === 'boolean' ? raw.honorRetryAfter : DEFAULT_RELIABILITY_SETTINGS.honorRetryAfter,
    autoFailoverEnabled: typeof raw.autoFailoverEnabled === 'boolean' ? raw.autoFailoverEnabled : DEFAULT_RELIABILITY_SETTINGS.autoFailoverEnabled,
    fallbackModels: normalizeModelList(raw.fallbackModels),
    cooldownMs: clampInt(raw.cooldownMs, DEFAULT_RELIABILITY_SETTINGS.cooldownMs, 0, 15 * 60_000),
    autoRestorePreferredModel: typeof raw.autoRestorePreferredModel === 'boolean' ? raw.autoRestorePreferredModel : DEFAULT_RELIABILITY_SETTINGS.autoRestorePreferredModel,
    retryableErrorCodes,
    failoverErrorCodes,
  };
}

export function toRetryPolicy(settings: ReliabilitySettings): Partial<RetryPolicy> {
  return {
    maxAttempts: settings.autoRetryEnabled ? settings.maxAttempts : 1,
    baseDelayMs: settings.baseDelayMs,
    maxDelayMs: settings.maxDelayMs,
    jitterRatio: settings.jitterRatio,
    honorRetryAfter: settings.honorRetryAfter,
  };
}

export function getReliabilityDefaults(): ReliabilitySettings {
  return normalizeReliabilitySettings(DEFAULT_RELIABILITY_SETTINGS);
}
