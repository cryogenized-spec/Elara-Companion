import type { ClassifiedApiError } from './apiError';

export interface ModelHealthRecord {
  failureCount: number;
  lastFailureAt?: number;
  lastFailureCode?: ClassifiedApiError['code'];
  cooldownUntil?: number;
}

export interface ModelHealthState {
  models: Record<string, ModelHealthRecord>;
}

export const DEFAULT_MODEL_COOLDOWN_MS = 60_000;

export function createModelHealthState(): ModelHealthState {
  return { models: {} };
}

function normalizeModelId(modelId: string): string {
  return modelId.trim().toLowerCase();
}

function getRecord(state: ModelHealthState, modelId: string): ModelHealthRecord {
  const key = normalizeModelId(modelId);
  return state.models[key] || { failureCount: 0 };
}

export function recordModelFailure(
  state: ModelHealthState,
  modelId: string,
  error: ClassifiedApiError,
  now = Date.now(),
  cooldownMs = DEFAULT_MODEL_COOLDOWN_MS,
): ModelHealthState {
  const key = normalizeModelId(modelId);
  const current = getRecord(state, key);
  const failureCount = current.failureCount + 1;
  return {
    models: {
      ...state.models,
      [key]: {
        failureCount,
        lastFailureAt: now,
        lastFailureCode: error.code,
        cooldownUntil: now + Math.max(0, cooldownMs),
      },
    },
  };
}

export function recordModelSuccess(
  state: ModelHealthState,
  modelId: string,
): ModelHealthState {
  const key = normalizeModelId(modelId);
  const next = { ...state.models };
  delete next[key];
  return { models: next };
}

export function isModelCoolingDown(
  state: ModelHealthState,
  modelId: string,
  now = Date.now(),
): boolean {
  const record = state.models[normalizeModelId(modelId)];
  return Boolean(record?.cooldownUntil && record.cooldownUntil > now);
}

export interface ModelSelectionInput {
  preferredModel: string;
  fallbackModels: string[];
  state: ModelHealthState;
  now?: number;
}

export interface ModelSelectionResult {
  model: string;
  usedFallback: boolean;
  probingPreferred: boolean;
}

export function selectRuntimeModel(input: ModelSelectionInput): ModelSelectionResult {
  const now = input.now ?? Date.now();
  const preferred = input.preferredModel.trim();
  const preferredCooling = isModelCoolingDown(input.state, preferred, now);

  // The preferred model is always the first choice when healthy or when its cooldown has expired.
  if (!preferredCooling) {
    return {
      model: preferred,
      usedFallback: false,
      probingPreferred: Boolean(input.state.models[normalizeModelId(preferred)]),
    };
  }

  const fallbacks = input.fallbackModels.map(normalizeModelId).filter(Boolean);
  const uniqueFallbacks = [...new Set(fallbacks)]
    .filter((model) => model !== normalizeModelId(preferred));

  const fallback = uniqueFallbacks.find((model) => !isModelCoolingDown(input.state, model, now));
  if (fallback) {
    return { model: fallback, usedFallback: true, probingPreferred: false };
  }

  // All fallbacks are unhealthy; probe the preferred model rather than inventing another route.
  return { model: preferred, usedFallback: false, probingPreferred: true };
}

export function clearExpiredModelHealth(
  state: ModelHealthState,
  now = Date.now(),
): ModelHealthState {
  const models = Object.fromEntries(
    Object.entries(state.models).filter(([, record]) => (record.cooldownUntil ?? 0) > now),
  );
  return { models };
}
