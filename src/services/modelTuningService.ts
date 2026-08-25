import type { ElaraSettings } from '../types';
import { getDbSettings, setDbSettings } from '../lib/db';
import { getModelProfile } from '../lib/modelRegistry';
import { discoverGeminiModels, type DiscoveredModel } from '../lib/modelDiscovery';
import { applySettingsAppearance } from '../lib/themeManager';
import { loadThinkingDisplayMode, saveThinkingDisplayMode, type ThinkingDisplayMode } from '../lib/thinkingDisplay';

/** Application-facing boundary for model tuning and its persisted presentation settings. */
export async function loadModelTuningSettings(): Promise<ElaraSettings> {
  const settings = await getDbSettings();
  applySettingsAppearance(settings);
  return settings;
}

export async function saveModelTuningSettings(settings: ElaraSettings): Promise<void> {
  await setDbSettings(settings);
  applySettingsAppearance(settings);
}

export function getModelTuningProfile(model: string) {
  return getModelProfile(model);
}

export async function discoverAvailableModels(apiKey: string, forceRefresh = false): Promise<DiscoveredModel[]> {
  return discoverGeminiModels(apiKey, forceRefresh);
}

export function loadModelThinkingDisplayMode(): ThinkingDisplayMode {
  return loadThinkingDisplayMode();
}

export function saveModelThinkingDisplayMode(mode: ThinkingDisplayMode): void {
  saveThinkingDisplayMode(mode);
}
