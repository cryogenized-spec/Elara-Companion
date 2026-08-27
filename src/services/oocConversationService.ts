import type { ElaraSettings } from '../types';
import { DEFAULT_PERSONA_PROTOCOL, DEFAULT_INTIMACY_MODULE, DEFAULT_RUNTIME_RULES } from '../constants/defaultPrompt';
import { buildSystemPayload, loadActiveScratchpad, loadUserProfileNotes } from '../lib/contextManager';
import { buildRuntimeConfig } from '../runtime/geminiRuntimeConfigService';
import { geminiRuntimeContract } from '../contracts/implementations';
import type { GeminiHistoryMessage } from '../contracts';

export interface OocMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface OocExecutionRequest {
  settings: ElaraSettings;
  roleplayContext: string;
  history: OocMessage[];
  message: string;
  signal?: AbortSignal;
  onComplete: (responseText: string) => void;
}

export async function streamOocResponse(request: OocExecutionRequest): Promise<void> {
  const { settings, roleplayContext, history, message, signal, onComplete } = request;

  const baseSystemInstruction = settings.systemPrompt.replaceAll('[[user]]', settings.userName || 'User');
  const oocFrame = `\n\n[OOC CONVERSATION MODE]\nRemain Elara exactly as defined by the governing system and persona instructions. OOC changes only the framing of the discussion; it does not change Elara's identity, values, voice, or relationship with the user.\n\nDiscuss the shared roleplay from a reflective, meta-level perspective. You may analyse character motivations, continuity, pacing, scene choices, consequences, worldbuilding, and the user's fictional character's actions. Treat Elara's fictional actions as hers and the user's fictional actions as belonging to the user's character. Do not switch into generic assistant language or claim to become an external narrator.\n\nThis pass is discussion-only. Do not use tools, create or modify artifacts, access Google services, alter application state, or perform external actions from OOC. When an action should actually be performed, discuss it here and leave the handoff to the main Elara agent for the next pass.\n\n[ROLEPLAY CONTEXT]\n${roleplayContext || 'No roleplay messages exist yet.'}\n`;

  const systemPrompt = buildSystemPayload({
    baseSystemInstruction: `${baseSystemInstruction}${oocFrame}`,
    personaProtocol: settings.personaProtocol || DEFAULT_PERSONA_PROTOCOL,
    intimacyModule: settings.intimacyModule || DEFAULT_INTIMACY_MODULE,
    runtimeRules: settings.runtimeRules || DEFAULT_RUNTIME_RULES,
    adultFictionEnabled: settings.adultFictionEnabled,
    adultFictionModule: settings.adultFictionModule,
    activeModelId: settings.model || 'gemini-3.7-flash',
    uiSettingsSummary: `Theme: ${settings.theme}, User: ${settings.userName || 'User'}, Timezone: ${settings.timezone}`,
    userProfileNotes: loadUserProfileNotes(),
    activeScratchpad: loadActiveScratchpad(),
  });

  const historyPayload: GeminiHistoryMessage[] = history.slice(-20).map((item) => ({
    role: item.role,
    content: item.content,
  }));

  let responseText = '';
  await geminiRuntimeContract.stream({
    apiKey: settings.apiKey?.trim() || '',
    model: settings.model || 'gemini-3.7-flash',
    systemPrompt,
    history: historyPayload,
    message,
    temperature: settings.temperature,
    maxOutputTokens: settings.maxOutputTokens,
    topP: settings.topP,
    topK: settings.topK,
    thinkingBudget: settings.thinkingBudget,
    signal,
    onChunk: (chunk) => {
      if (chunk.text) responseText += chunk.text;
    },
  });

  onComplete(responseText.trim() || 'I have nothing further to add on that point just yet.');
}
