import { AVAILABLE_MODELS, type GeminiModelOption } from '../types';
import { DEFAULT_RELIABILITY_SETTINGS, type ReliabilitySettings, normalizeReliabilitySettings } from './reliabilitySettings';

export interface ModelPreferenceState {
  preferredModel: string;
  preferredModelOrder: string[];
}

export interface ModelPreferenceOption extends GeminiModelOption {
  preferenceRank: number | null;
  isPreferred: boolean;
  isAvailable: boolean;
}

const MODEL_CATALOG = new Map(AVAILABLE_MODELS.map((model) => [model.id, model]));

function normalizeModelId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function sanitizeOrder(order: unknown): string[] {
  if (!Array.isArray(order)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of order) {
    const id = normalizeModelId(raw);
    if (!id || seen.has(id) || !MODEL_CATALOG.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function resolveModelPreferenceOrder(
  preferredModel: string | null | undefined,
  reliabilitySettings?: Partial<ReliabilitySettings> | null,
): string[] {
  const normalizedPrimary = normalizeModelId(preferredModel);
  const normalizedSettings = normalizeReliabilitySettings(reliabilitySettings);
  const configuredOrder = sanitizeOrder(normalizedSettings.preferredModelOrder);
  const order = configuredOrder.length ? configuredOrder : sanitizeOrder(DEFAULT_RELIABILITY_SETTINGS.preferredModelOrder);

  if (normalizedPrimary && MODEL_CATALOG.has(normalizedPrimary)) {
    return [normalizedPrimary, ...order.filter((id) => id !== normalizedPrimary)];
  }

  return order;
}

export function createModelPreferenceState(
  preferredModel: string | null | undefined,
  reliabilitySettings?: Partial<ReliabilitySettings> | null,
): ModelPreferenceState {
  const order = resolveModelPreferenceOrder(preferredModel, reliabilitySettings);
  return {
    preferredModel: order[0] || normalizeModelId(preferredModel) || DEFAULT_RELIABILITY_SETTINGS.preferredModelOrder[0],
    preferredModelOrder: order,
  };
}

export function applyModelPreferenceOrder(
  currentSettings: Partial<ReliabilitySettings> | null | undefined,
  order: string[],
): ReliabilitySettings {
  const normalized = normalizeReliabilitySettings(currentSettings);
  const sanitized = sanitizeOrder(order);
  return normalizeReliabilitySettings({
    ...normalized,
    preferredModelOrder: sanitized.length ? sanitized : normalized.preferredModelOrder,
  });
}

export function getModelPreferenceOptions(
  state: ModelPreferenceState,
  configuredModelIds: string[] = state.preferredModelOrder,
): ModelPreferenceOption[] {
  const normalizedConfigured = sanitizeOrder(configuredModelIds);
  return AVAILABLE_MODELS.map((model) => {
    const rankIndex = state.preferredModelOrder.indexOf(model.id);
    return {
      ...model,
      preferenceRank: rankIndex >= 0 ? rankIndex + 1 : null,
      isPreferred: model.id === state.preferredModel,
      isAvailable: normalizedConfigured.includes(model.id) || model.id === state.preferredModel,
    };
  });
}

export function isKnownModel(modelId: string): boolean {
  return MODEL_CATALOG.has(modelId.trim().toLowerCase());
}
