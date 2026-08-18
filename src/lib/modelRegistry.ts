import { GeminiModelOption } from '../types';

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export interface GeminiModelProfile extends GeminiModelOption {
  status: 'stable' | 'preview';
  family: 'gemini-3' | 'gemini-2.5';
  supportsThinking: boolean;
  thinkingControl: 'level' | 'budget' | 'none';
  thinkingLevels?: ThinkingLevel[];
  thinkingBudgetMin?: number;
  thinkingBudgetMax?: number;
  canDisableThinking?: boolean;
  temperatureMin: number;
  temperatureMax: number;
  topPMin: number;
  topPMax: number;
  topKMin: number;
  topKMax: number;
  maxOutputTokensMin: number;
  maxOutputTokensMax: number;
}

const COMMON = {
  temperatureMin: 0,
  temperatureMax: 2,
  topPMin: 0,
  topPMax: 1,
  topKMin: 1,
  topKMax: 100,
  maxOutputTokensMin: 256,
  maxOutputTokensMax: 65536,
};

export const GEMINI_MODEL_PROFILES: GeminiModelProfile[] = [
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    description: 'Latest stable Flash; optimized for complex coding, agentic workflows and multi-step execution.',
    isDefault: true,
    status: 'stable',
    family: 'gemini-3',
    supportsThinking: true,
    thinkingControl: 'level',
    thinkingLevels: ['low', 'medium', 'high'],
    ...COMMON,
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    description: 'Stable Flash for fast multimodal, general-purpose and agentic work.',
    status: 'stable',
    family: 'gemini-3',
    supportsThinking: true,
    thinkingControl: 'level',
    thinkingLevels: ['minimal', 'low', 'medium', 'high'],
    ...COMMON,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    description: 'Stable legacy Flash for routine, high-throughput workloads.',
    status: 'stable',
    family: 'gemini-3',
    supportsThinking: true,
    thinkingControl: 'level',
    thinkingLevels: ['minimal', 'low', 'medium', 'high'],
    ...COMMON,
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    description: 'Stable, fast and cost-efficient Flash-Lite for high-throughput execution.',
    status: 'stable',
    family: 'gemini-3',
    supportsThinking: true,
    thinkingControl: 'level',
    thinkingLevels: ['minimal', 'low', 'medium', 'high'],
    ...COMMON,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    description: 'Stable lightweight Flash with strong performance at low cost.',
    status: 'stable',
    family: 'gemini-3',
    supportsThinking: true,
    thinkingControl: 'level',
    thinkingLevels: ['minimal', 'low', 'medium', 'high'],
    ...COMMON,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    description: 'Preview high-intelligence model for complex reasoning, coding and demanding agentic work.',
    status: 'preview',
    family: 'gemini-3',
    supportsThinking: true,
    thinkingControl: 'level',
    thinkingLevels: ['low', 'medium', 'high'],
    ...COMMON,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    description: 'Preview frontier Flash model for high-quality reasoning at lower cost.',
    status: 'preview',
    family: 'gemini-3',
    supportsThinking: true,
    thinkingControl: 'level',
    thinkingLevels: ['minimal', 'low', 'medium', 'high'],
    ...COMMON,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Stable 2.5 Flash for low-latency, high-volume reasoning tasks.',
    status: 'stable',
    family: 'gemini-2.5',
    supportsThinking: true,
    thinkingControl: 'budget',
    thinkingBudgetMin: 0,
    thinkingBudgetMax: 24576,
    canDisableThinking: true,
    ...COMMON,
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    description: 'Stable 2.5 Flash-Lite for the fastest and most budget-friendly multimodal execution.',
    status: 'stable',
    family: 'gemini-2.5',
    supportsThinking: true,
    thinkingControl: 'budget',
    thinkingBudgetMin: 0,
    thinkingBudgetMax: 24576,
    canDisableThinking: true,
    ...COMMON,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Stable 2.5 Pro for advanced reasoning and complex tasks.',
    status: 'stable',
    family: 'gemini-2.5',
    supportsThinking: true,
    thinkingControl: 'budget',
    thinkingBudgetMin: 128,
    thinkingBudgetMax: 32768,
    canDisableThinking: false,
    ...COMMON,
  },
];

export const AVAILABLE_CHAT_MODELS = GEMINI_MODEL_PROFILES;

export const DEFAULT_GEMINI_MODEL = 'gemini-3.7-flash';

export function getModelProfile(modelId?: string): GeminiModelProfile {
  const clean = (modelId || DEFAULT_GEMINI_MODEL).replace(/^models\//, '').trim();
  return GEMINI_MODEL_PROFILES.find((model) => model.id === clean) || GEMINI_MODEL_PROFILES[0];
}

export function isGemini3Model(modelId?: string): boolean {
  return getModelProfile(modelId).family === 'gemini-3';
}

export function clampModelSettings(settings: {
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  thinkingBudget?: number;
}) {
  const profile = getModelProfile(settings.model);
  return {
    temperature: Math.min(profile.temperatureMax, Math.max(profile.temperatureMin, settings.temperature ?? 0.85)),
    topP: Math.min(profile.topPMax, Math.max(profile.topPMin, settings.topP ?? 0.95)),
    topK: Math.min(profile.topKMax, Math.max(profile.topKMin, settings.topK ?? 64)),
    maxOutputTokens: Math.min(profile.maxOutputTokensMax, Math.max(profile.maxOutputTokensMin, settings.maxOutputTokens ?? 8192)),
    thinkingBudget: profile.thinkingControl === 'budget'
      ? Math.min(profile.thinkingBudgetMax || 24576, Math.max(profile.thinkingBudgetMin ?? 0, settings.thinkingBudget ?? -1))
      : settings.thinkingBudget,
  };
}
