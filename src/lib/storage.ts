import { Conversation, ElaraSettings } from '../types';
import { DEFAULT_ELARA_SYSTEM_PROMPT } from '../constants/defaultPrompt';

const CONVERSATIONS_STORAGE_KEY = 'elara_conversations_v1';
const SETTINGS_STORAGE_KEY = 'elara_settings_v1';
const PORTRAIT_STORAGE_KEY = 'elara_custom_portrait_v1';

export function loadCustomPortrait(): string | null {
  try {
    return localStorage.getItem(PORTRAIT_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to load custom portrait from storage:', e);
    return null;
  }
}

export function saveCustomPortrait(base64Img: string | null): void {
  try {
    if (base64Img) {
      localStorage.setItem(PORTRAIT_STORAGE_KEY, base64Img);
    } else {
      localStorage.removeItem(PORTRAIT_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save custom portrait to storage:', e);
  }
}

export const DEFAULT_SETTINGS: ElaraSettings = {
  systemPrompt: DEFAULT_ELARA_SYSTEM_PROMPT,
  userName: 'User',
  model: 'gemini-3.7-flash',
  temperature: 0.85,
  maxOutputTokens: 3072,
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
  thinkingBudget: 4096,
};

export function loadSettings(): ElaraSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const loaded = { ...DEFAULT_SETTINGS, ...parsed };
    if (!loaded.model || loaded.model.includes('2.5')) {
      loaded.model = 'gemini-3.7-flash';
    }
    return loaded;
  } catch (e) {
    console.error('Failed to load settings from storage:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ElaraSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to storage:', e);
  }
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const seenConvIds = new Set<string>();
      const sanitized = parsed.map((conv: any, convIdx: number) => {
        let convId = conv.id && typeof conv.id === 'string' ? conv.id : `conv_${Date.now()}_${convIdx}`;
        while (seenConvIds.has(convId)) {
          convId = `${convId}_${Math.random().toString(36).substring(2, 6)}`;
        }
        seenConvIds.add(convId);

        const seenMsgIds = new Set<string>();
        const messages = Array.isArray(conv.messages)
          ? conv.messages.map((msg: any, msgIdx: number) => {
              let msgId = msg.id && typeof msg.id === 'string' ? msg.id : `msg_${Date.now()}_${msgIdx}`;
              while (seenMsgIds.has(msgId)) {
                msgId = `${msgId}_${Math.random().toString(36).substring(2, 6)}`;
              }
              seenMsgIds.add(msgId);
              return { ...msg, id: msgId };
            })
          : [];

        return { ...conv, id: convId, messages };
      });

      return sanitized.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
    return [];
  } catch (e) {
    console.error('Failed to load conversations from storage:', e);
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Failed to save conversations to storage:', e);
  }
}

export function exportAllDataJSON(conversations: Conversation[], settings: ElaraSettings): void {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    settings,
    conversations,
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `elara-conversations-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportConversationMarkdown(conversation: Conversation): void {
  let md = `# ${conversation.title}\n\n`;
  md += `*Date: ${new Date(conversation.createdAt).toLocaleString()}*\n\n---\n\n`;

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
    let importedSettings: Partial<ElaraSettings> | undefined = undefined;

    if (Array.isArray(parsed)) {
      importedConversations = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.conversations)) {
        importedConversations = parsed.conversations;
      }
      if (parsed.settings && typeof parsed.settings === 'object') {
        importedSettings = parsed.settings;
      }
    }

    // Validate structure
    const validConversations = importedConversations.filter(
      (c) => c && typeof c.id === 'string' && Array.isArray(c.messages)
    );

    return {
      conversations: validConversations,
      settings: importedSettings,
    };
  } catch (e) {
    throw new Error('Invalid JSON format for import');
  }
}

export function clearAllStorageData(): void {
  try {
    localStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear storage:', e);
  }
}
