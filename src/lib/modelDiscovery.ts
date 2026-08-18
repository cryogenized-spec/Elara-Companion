import type { GeminiModelOption } from '../types';
import { GEMINI_MODEL_PROFILES } from './modelRegistry';

const MODEL_CACHE_KEY = 'elara_gemini_model_catalog_v1';
const MODEL_CACHE_TTL_MS = 30 * 60 * 1000;

export interface DiscoveredModel extends GeminiModelOption {
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
  thinkingSupported?: boolean;
  maxTemperature?: number;
  topP?: number;
  topK?: number;
}

interface CachedCatalog {
  savedAt: number;
  models: DiscoveredModel[];
}

function readCache(): CachedCatalog | null {
  try {
    const raw = localStorage.getItem(MODEL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCatalog;
    if (!parsed?.savedAt || !Array.isArray(parsed.models)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(models: DiscoveredModel[]): void {
  try {
    localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), models }));
  } catch {
    // Model discovery must never make the application unusable.
  }
}

export function getCachedModels(): DiscoveredModel[] | null {
  const cached = readCache();
  return cached?.models || null;
}

export async function discoverGeminiModels(apiKey: string, forceRefresh = false): Promise<DiscoveredModel[]> {
  const cached = readCache();
  if (!forceRefresh && cached && Date.now() - cached.savedAt < MODEL_CACHE_TTL_MS) {
    return cached.models;
  }

  if (!apiKey?.trim()) return GEMINI_MODEL_PROFILES;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`);
    if (!response.ok) throw new Error(`Model discovery failed: HTTP ${response.status}`);
    const body = await response.json();
    const discovered: DiscoveredModel[] = (body.models || [])
      .filter((m: any) => Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods.includes('generateContent') : true)
      .map((m: any) => ({
        id: String(m.name || '').replace(/^models\//, ''),
        name: String(m.displayName || m.name || '').replace(/^models\//, ''),
        description: String(m.description || ''),
        inputTokenLimit: typeof m.inputTokenLimit === 'number' ? m.inputTokenLimit : undefined,
        outputTokenLimit: typeof m.outputTokenLimit === 'number' ? m.outputTokenLimit : undefined,
        supportedGenerationMethods: Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : undefined,
        thinkingSupported: typeof m.thinking === 'boolean' ? m.thinking : undefined,
        maxTemperature: typeof m.maxTemperature === 'number' ? m.maxTemperature : undefined,
        topP: typeof m.topP === 'number' ? m.topP : undefined,
        topK: typeof m.topK === 'number' ? m.topK : undefined,
      }))
      .filter((m: DiscoveredModel) => m.id.startsWith('gemini-'));

    if (discovered.length > 0) writeCache(discovered);
    return discovered.length > 0 ? discovered : GEMINI_MODEL_PROFILES;
  } catch {
    return cached?.models || GEMINI_MODEL_PROFILES;
  }
}
