import { HarmCategory, HarmBlockThreshold } from '@google/genai';
import type { Workspace } from '../types';
import { getModelProfile } from '../lib/modelRegistry';
import { agentToolDeclarations, getAgentToolDeclarations } from '../lib/agentToolRegistry';
import { buildWorkspaceContextPrompt } from '../lib/workspaceTools';
import { TEXT_PROCESSING_POLICY } from '../constants/textProcessingPolicy';
import type { ToolExposurePolicy } from '../security/toolExposurePolicy';

/** Full BLOCK_NONE safety settings for every Gemini call. Never omit or override. */
export const ELARA_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export interface RuntimeConfigOptions {
  model: string;
  systemPrompt?: string;
  workspace?: Workspace;
  googleToken?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  thinkingBudget?: number;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  toolExposure?: ToolExposurePolicy;
  /** @deprecated Always applied. Kept for type compatibility only. */
  includeSafetySettings?: boolean;
}

export function parseRuntimeDataUrl(value: string): { mimeType: string; data: string } | null {
  const match = value.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

export function deriveThinkingLevel(explicitLevel: RuntimeConfigOptions['thinkingLevel'], budget?: number): 'minimal' | 'low' | 'medium' | 'high' {
  if (explicitLevel) return explicitLevel;
  if (typeof budget !== 'number' || budget < 0) return 'medium';
  if (budget === 0) return 'minimal';
  if (budget <= 2048) return 'low';
  if (budget <= 6144) return 'medium';
  return 'high';
}

export function normalizeModel(model: string, fallback = 'gemini-3.7-flash'): string {
  return model.replace(/^models\//, '').trim() || fallback;
}

export function buildRuntimeConfig(options: RuntimeConfigOptions): any {
  const model = normalizeModel(options.model);
  const profile = getModelProfile(model);
  const workspaceContext = buildWorkspaceContextPrompt(options.workspace, Boolean(options.googleToken));
  const config: any = {};

  const combinedPrompt = [TEXT_PROCESSING_POLICY, options.systemPrompt || '', workspaceContext].filter(Boolean).join('\n\n').trim();
  if (combinedPrompt) config.systemInstruction = combinedPrompt;

  config.safetySettings = ELARA_SAFETY_SETTINGS;

  if (profile.supportsTemperature && typeof options.temperature === 'number') {
    config.temperature = Math.min(profile.temperatureMax, Math.max(profile.temperatureMin, options.temperature));
  }
  if (typeof options.maxOutputTokens === 'number' && options.maxOutputTokens > 0) {
    config.maxOutputTokens = Math.min(profile.maxOutputTokensMax, Math.max(profile.maxOutputTokensMin, options.maxOutputTokens));
  }
  if (profile.supportsTopP && typeof options.topP === 'number') {
    config.topP = Math.min(profile.topPMax, Math.max(profile.topPMin, options.topP));
  }
  if (profile.supportsTopK && typeof options.topK === 'number') {
    config.topK = Math.min(profile.topKMax, Math.max(profile.topKMin, options.topK));
  }

  if (profile.thinkingControl === 'level') {
    let level = deriveThinkingLevel(options.thinkingLevel, options.thinkingBudget);
    if (!profile.thinkingLevels?.includes(level)) level = profile.thinkingLevels?.[0] || 'low';
    config.thinkingConfig = { thinkingLevel: level, includeThoughts: true };
  } else if (profile.thinkingControl === 'budget') {
    config.thinkingConfig = { thinkingBudget: typeof options.thinkingBudget === 'number' ? options.thinkingBudget : -1, includeThoughts: true };
  }

  config.tools = [{ functionDeclarations: options.toolExposure ? getAgentToolDeclarations(options.toolExposure) : agentToolDeclarations }];
  return config;
}
