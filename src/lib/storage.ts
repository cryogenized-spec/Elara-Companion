import { Conversation, ElaraSettings } from '../types';
import {
  DEFAULT_ELARA_SYSTEM_PROMPT,
  DEFAULT_PERSONA_PROTOCOL,
  DEFAULT_INTIMACY_MODULE,
  DEFAULT_RUNTIME_RULES
} from '../constants/defaultPrompt';
import { DEFAULT_AGENT_BEHAVIOR_POLICY } from '../constants/defaultAgentBehaviorPolicy';
import { DEFAULT_GEMINI_MODEL, GEMINI_MODEL_PROFILES } from './modelRegistry';
import { applySettingsAppearance } from './themeManager';

const CONVERSATIONS_STORAGE_KEY = 'elara_conversations_v1';
const SETTINGS_STORAGE_KEY = 'elara_settings_v1';
const PORTRAIT_STORAGE_KEY = 'elara_custom_portrait_v1';

export function loadCustomPortrait(): string | null {
  try { return localStorage.getItem(PORTRAIT_STORAGE_KEY); }
  catch (e) { console.error('Failed to load custom portrait from storage:', e); return null; }
}
export function saveCustomPortrait(base64Img: string | null): void {
  try {
    if (base64Img) localStorage.setItem(PORTRAIT_STORAGE_KEY, base64Img);
    else localStorage.removeItem(PORTRAIT_STORAGE_KEY);
  } catch (e) { console.error('Failed to save portrait:', e); }
}

export const DEFAULT_SETTINGS: ElaraSettings = {
  systemPrompt: DEFAULT_ELARA_SYSTEM_PROMPT,
  personaProtocol: DEFAULT_PERSONA_PROTOCOL,
  intimacyModule: DEFAULT_INTIMACY_MODULE,
  runtimeRules: DEFAULT_RUNTIME_RULES,
  agentBehaviorPolicy: DEFAULT_AGENT_BEHAVIOR_POLICY,
  userName: 'User',
  model: DEFAULT_GEMINI_MODEL,
  temperature: 0.85,
  maxOutputTokens: 16384,
  topP: 0.95,
  topK: 64,
  includeHistory: true,
  theme: 'dark',
  portraitScale: 1.0,
  backdropImage: null,
  backdropOpacity: 0.3,
  backdropBlur: 4,
  timezone: 'Africa/Johannesburg',
  fontSize: 14,
  textBackground: 'slate',
  userFontFamily: 'system-ui',
  userFontSource: 'system',
  userFontWeight: 400,
  userTextColor: '#e4e4e7',
  userFontSize: 14,
  assistantFontFamily: 'system-ui',
  assistantFontSource: 'system',
  assistantFontWeight: 400,
  assistantTextColor: '#f4f4f5',
  assistantFontSize: 14,
  thinkingBudget: 4096,
  thinkingLevel: 'medium',
  sendOnEnter: false,
  speechLanguage: 'en-US',
  speechAutoSend: false,
  speechAutoCapitalize: true,
  speechPauseTimeout: 2000,
};

export function loadSettings(): ElaraSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      applySettingsAppearance(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    const loaded = { ...DEFAULT_SETTINGS, ...parsed };
    const isActiveModel = GEMINI_MODEL_PROFILES.some((m) => m.id === loaded.model);
    if (!loaded.model || !isActiveModel) loaded.model = DEFAULT_GEMINI_MODEL;
    applySettingsAppearance(loaded);
    return loaded;
  } catch (e) {
    console.error('Failed to load settings from storage:', e);
    applySettingsAppearance(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}
export function saveSettings(settings: ElaraSettings): void {
  try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)); }
  catch (e) { console.error('Failed to save settings:', e); }
  applySettingsAppearance(settings);
}

const FOLDERS_STORAGE_KEY = 'elara_folders_v1';
export function loadFolders(): import('../types').Folder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (!raw) return [{ id: 'default', name: 'General', isExpanded: true }];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [{ id: 'default', name: 'General', isExpanded: true }];
  } catch (e) {
    console.error('Failed to load folders:', e);
    return [{ id: 'default', name: 'General', isExpanded: true }];
  }
}
export function saveFolders(folders: import('../types').Folder[]): void {
  try { localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders)); }
  catch (e) { console.error('Failed to save folders:', e); }
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load conversations:', e);
    return [];
  }
}
export function saveConversations(conversations: Conversation[]): void {
  try { localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations)); }
  catch (e) { console.error('Failed to save conversations:', e); }
}
