import { Conversation, ElaraSettings } from '../types';
import {
  DEFAULT_ELARA_SYSTEM_PROMPT,
  DEFAULT_PERSONA_PROTOCOL,
  DEFAULT_INTIMACY_MODULE,
  DEFAULT_RUNTIME_RULES,
  DEFAULT_ADULT_FICTION_MODULE,
} from '../constants/defaultPrompt';
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
  adultFictionEnabled: true,
  adultFictionModule: DEFAULT_ADULT_FICTION_MODULE,
  userName: 'User',
  model: DEFAULT_GEMINI_MODEL,
  temperature: 0.85,
  maxOutputTokens: 16384,
  topP: 0.95,
  topK: 64,
  includeHistory: true,
  theme: 'dark',
  themeMode: 'dark',
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
    // Ensure new fields exist for users who had older settings
    if (typeof loaded.adultFictionEnabled !== 'boolean') loaded.adultFictionEnabled = true;
    if (typeof loaded.adultFictionModule !== 'string' || !loaded.adultFictionModule.trim()) {
      loaded.adultFictionModule = DEFAULT_ADULT_FICTION_MODULE;
    }
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
    if (!Array.isArray(parsed)) return [];

    const seenConvIds = new Set<string>();
    const sanitized = parsed.map((conv: any, convIdx: number) => {
      let convId = conv.id && typeof conv.id === 'string' ? conv.id : `conv_${Date.now()}_${convIdx}`;
      while (seenConvIds.has(convId)) convId = `${convId}_${Math.random().toString(36).substring(2, 6)}`;
      seenConvIds.add(convId);

      const seenMsgIds = new Set<string>();
      const messages = Array.isArray(conv.messages) ? conv.messages.map((msg: any, msgIdx: number) => {
        let msgId = msg.id && typeof msg.id === 'string' ? msg.id : `msg_${Date.now()}_${msgIdx}`;
        while (seenMsgIds.has(msgId)) msgId = `${msgId}_${Math.random().toString(36).substring(2, 6)}`;
        seenMsgIds.add(msgId);
        return { ...msg, id: msgId };
      }) : [];

      return { ...conv, id: convId, messages };
    });

    return sanitized.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (e) {
    console.error('Failed to load conversations:', e);
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try { localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations)); }
  catch (e) { console.error('Failed to save conversations:', e); }
}

export function exportAllDataJSON(conversations: Conversation[], settings: ElaraSettings): void {
  const data = { version: '3.0', exportDate: new Date().toISOString(), settings, conversations };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `elara-conversations-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportConversationMarkdown(conversation: Conversation): void {
  let md = `# ${conversation.title}\n\n*Date: ${new Date(conversation.createdAt).toLocaleString()}*\n\n---\n\n`;
  conversation.messages.forEach((msg) => {
    const roleName = msg.role === 'user' ? 'User' : 'Elara';
    const time = new Date(msg.timestamp).toLocaleTimeString();
    md += `### ${roleName} (${time})\n\n${msg.content}\n\n---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${conversation.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importDataJSON(jsonStr: string): { conversations: Conversation[]; settings?: Partial<ElaraSettings> } {
  try {
    const parsed = JSON.parse(jsonStr);
    let importedConversations: Conversation[] = [];
    let importedSettings: Partial<ElaraSettings> | undefined;

    if (Array.isArray(parsed)) importedConversations = parsed;
    else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.conversations)) importedConversations = parsed.conversations;
      if (parsed.settings && typeof parsed.settings === 'object') importedSettings = parsed.settings;
    }

    const validConversations = importedConversations.filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages));
    return { conversations: validConversations, settings: importedSettings };
  } catch (e) {
    throw new Error('Invalid JSON format for import');
  }
}

export function clearAllStorageData(): void {
  try {
    localStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch (e) { console.error('Failed to clear storage:', e); }
}

export function incrementRateLimit(modelId: string): void {
  const dateStr = new Date().toLocaleDateString();
  let data = loadRateLimits();
  if (data.date !== dateStr) data = { date: dateStr, counts: {} };
  data.counts[modelId] = (data.counts[modelId] || 0) + 1;
  try { localStorage.setItem('elara_api_rate_limits', JSON.stringify(data)); }
  catch (e) { console.error('Failed to save rate limits:', e); }
}

export function generateUniqueId(prefix: string = 'id'): string { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
export function generateId(prefix: string = 'id'): string { return generateUniqueId(prefix); }

export function loadRateLimits(): { date: string; counts: Record<string, number> } {
  const dateStr = new Date().toLocaleDateString();
  try {
    const raw = localStorage.getItem('elara_api_rate_limits');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === dateStr) return parsed;
    }
  } catch (e) { console.error('Failed to load rate limits:', e); }
  return { date: dateStr, counts: {} };
}
