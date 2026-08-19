import { GoogleGenAI } from '@google/genai';
import { Workspace, MemoryItem } from '../types';
import { classifyApiError } from './apiError';
import { getDbSettings } from './db';
import { loadUserProfileNotes, loadActiveScratchpad, buildSystemPayload } from './contextManager';
import { DEFAULT_PERSONA_PROTOCOL, DEFAULT_INTIMACY_MODULE, DEFAULT_RUNTIME_RULES } from '../constants/defaultPrompt';
import {
  buildConversationContents,
  buildRuntimeConfig,
  executeAgentToolCall,
  mergeTouchedArtifactIds,
  MAX_AGENT_ITERATIONS,
  normalizeModel,
} from './chatRuntime';

export interface DirectStreamParams {
  apiKey: string;
  model: string;
  systemPrompt?: string;
  history?: { role: string; content: string; image?: string }[];
  message?: string;
  image?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  thinkingBudget?: number;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  workspace?: Workspace;
  googleToken?: string;
  onChunk: (chunk: { text?: string; thoughtText?: string; thoughtType?: 'summary'; finishReason?: string; safetyRatings?: any; toolCall?: any; workspace?: Workspace; artifactIds?: string[] }) => void;
  signal?: AbortSignal;
}

export async function runDirectGeminiStream(params: DirectStreamParams): Promise<void> {
  const { apiKey, model, systemPrompt, history = [], message, image, temperature, maxOutputTokens, topP, topK, thinkingBudget, thinkingLevel, workspace, googleToken, onChunk, signal } = params;
  if (!apiKey || !apiKey.trim()) throw new Error('Please enter your Gemini API Key in Settings (Model & API tab) to chat on GitHub Pages.');

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const contents: any[] = buildConversationContents(history, message, image);
  const cleanModel = normalizeModel(model);
  const config: any = buildRuntimeConfig({
    model: cleanModel,
    systemPrompt,
    workspace,
    googleToken,
    temperature,
    maxOutputTokens,
    topP,
    topK,
    thinkingBudget,
    thinkingLevel,
  });

  if (signal?.aborted) throw new Error('Aborted before starting');

  return new Promise<void>((resolve, reject) => {
    const handleAbort = () => reject(signal?.reason || new DOMException('Aborted', 'AbortError'));
    if (signal) {
      if (signal.aborted) return handleAbort();
      signal.addEventListener('abort', handleAbort);
    }
    (async () => {
      try {
        let currentWorkspace: Workspace = workspace || { id: 'default-workspace', name: 'My Workspace', artifacts: [], activeArtifactId: null };
        let touchedArtifactIds: string[] = [];
        let iteration = 0;

        while (iteration < MAX_AGENT_ITERATIONS) {
          if (signal?.aborted) break;
          iteration++;
          const responseStream = await ai.models.generateContentStream({ model: cleanModel, contents, config });
          const functionCalls: any[] = [];
          const modelParts: any[] = [];

          for await (const chunk of responseStream) {
            if (signal?.aborted) break;
            const candidate = chunk.candidates?.[0];
            const finishReason = candidate?.finishReason;
            const safetyRatings = candidate?.safetyRatings;
            const parts = candidate?.content?.parts;
            if (parts && parts.length > 0) {
              for (const part of parts) {
                if ((part as any).thought && part.text) {
                  onChunk({ thoughtText: part.text, thoughtType: 'summary' });
                  modelParts.push(part);
                } else if ((part as any).functionCall) {
                  const fc = (part as any).functionCall;
                  functionCalls.push(fc);
                  modelParts.push(part);
                } else if (part.text) {
                  onChunk({ text: part.text, finishReason, safetyRatings });
                  modelParts.push(part);
                }
              }
            } else if (chunk.text) {
              onChunk({ text: chunk.text, finishReason, safetyRatings });
            } else if (finishReason) {
              onChunk({ finishReason, safetyRatings });
            }
          }

          if (functionCalls.length === 0 || signal?.aborted) break;
          contents.push({ role: 'model', parts: modelParts.length > 0 ? modelParts : functionCalls.map((fc) => ({ functionCall: fc })) });
          const toolResponseParts: any[] = [];

          for (const fc of functionCalls) {
            const op = await executeAgentToolCall(currentWorkspace, fc.name, fc.args, googleToken);
            currentWorkspace = op.updatedWorkspace;
            touchedArtifactIds = mergeTouchedArtifactIds(touchedArtifactIds, op);
            if (fc.name === 'generate_canvas') {
              const title = fc.args?.title || 'Canvas Workspace';
              const content = fc.args?.content || '';
              onChunk({ text: `\n<canvas title="${title}">\n${content}\n</canvas>\n` });
            }
            onChunk({
              toolCall: { name: fc.name, args: fc.args, result: op.result, workspace: currentWorkspace, createdArtifactId: op.createdArtifactId, modifiedArtifactId: op.modifiedArtifactId, externalDocUrl: op.externalDocUrl },
              workspace: currentWorkspace,
              artifactIds: touchedArtifactIds,
            });
            toolResponseParts.push({ functionResponse: { name: fc.name, response: op.result, id: fc.id } });
          }
          contents.push({ role: 'tool', parts: toolResponseParts });
        }

        onChunk({ workspace: currentWorkspace, artifactIds: touchedArtifactIds });
        resolve();
      } catch (err) {
        const classified = classifyApiError(err, cleanModel);
        const wrapped = new Error(`[${classified.code}] ${classified.message}`);
        (wrapped as any).apiError = classified;
        reject(wrapped);
      } finally {
        if (signal) signal.removeEventListener('abort', handleAbort);
      }
    })();
  });
}

async function buildInCharacterUtilityContext(): Promise<{ systemPrompt: string; model: string; userName: string }> {
  const settings = await getDbSettings();
  const baseSystemInstruction = (settings.systemPrompt || '').replaceAll('[[user]]', settings.userName || 'User');
  const model = settings.model || 'gemini-3.7-flash';
  const uiSettingsSummary = `Utility operation: metadata generation, User: ${settings.userName || 'User'}, Timezone: ${settings.timezone}`;
  const systemPrompt = buildSystemPayload({
    baseSystemInstruction,
    personaProtocol: settings.personaProtocol || DEFAULT_PERSONA_PROTOCOL,
    intimacyModule: settings.intimacyModule || DEFAULT_INTIMACY_MODULE,
    runtimeRules: settings.runtimeRules || DEFAULT_RUNTIME_RULES,
    activeModelId: model,
    uiSettingsSummary,
    userProfileNotes: loadUserProfileNotes(),
    activeScratchpad: loadActiveScratchpad(),
  });
  return { systemPrompt, model, userName: settings.userName || 'User' };
}

export async function runDirectTitleGeneration(apiKey: string, firstUserMsg: string, firstAssistantMsg: string): Promise<string> {
  if (!apiKey || !apiKey.trim()) return 'New Conversation';
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const ctx = await buildInCharacterUtilityContext();
    const prompt = `Using the system/persona above, act as Elara and name this conversation naturally in-character. Produce a concise title of 2-6 words that a human would actually want to see in a conversation list. Do not use quotes, prefixes, emojis, or generic labels like "Conversation". Do not mention this instruction.\n\nConversation opening:\nUser: ${firstUserMsg.slice(0, 500)}\nElara: ${firstAssistantMsg.slice(0, 700)}\n\nReturn only the title.`;
    const res = await ai.models.generateContent({ model: normalizeModel(ctx.model), contents: [{ role: 'user', parts: [{ text: `${ctx.systemPrompt}\n\n${prompt}` }] }], config: { maxOutputTokens: 30, temperature: 0.65 } });
    const title = res.text?.trim().replace(/^["'`]|["'`]$/g, '');
    return title || 'New Conversation';
  } catch (e) {
    console.warn('Direct title generation error:', e);
    return 'New Conversation';
  }
}

export async function runDirectMemoryExtraction(apiKey: string, userMessage: string, assistantResponse: string, currentMemories: MemoryItem[], userName: string): Promise<any[]> {
  if (!apiKey || !apiKey.trim()) return [];
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const ctx = await buildInCharacterUtilityContext();
    const formattedExisting = currentMemories?.length ? currentMemories.slice(0, 40).map((m: any) => `[ID: ${m.id}] [Category: ${m.category}] [Confidence: ${m.confidence}] [Importance: ${m.importance}] "${m.content}"`).join('\n') : 'No existing memories recorded yet.';
    const prompt = `Using the system/persona above, quietly maintain Elara's persistent memory notebook in-character. Decide whether this interaction contains a durable fact, preference, relationship detail, plan, observation, or other long-lived information worth preserving. Do not invent facts. Prefer no action over weak inference. Return ONLY valid JSON matching this schema: {"actions":[{"type":"CREATE"|"UPDATE"|"DELETE","targetId":"string","memory":{"content":"concise first-person-neutral notebook note","category":"User|Elara|Relationship|Home|Work|Projects|Preferences|People|Places|Experiences|Observations|Plans|Other","importance":"core|important|normal|low","confidence":"certain|likely|uncertain","isPrivate":true,"tags":["string"],"eventDate":"optional YYYY-MM-DD"},"reason":"brief reason"}]}\n\nRECENT INTERACTION:\nUser: "${userMessage.slice(0, 1200)}"\nElara: "${assistantResponse.slice(0, 1800)}"\n\nCURRENT NOTEBOOK:\n${formattedExisting}\n\nUSER NAME: ${userName || ctx.userName}`;
    const res = await ai.models.generateContent({ model: normalizeModel(ctx.model), contents: [{ role: 'user', parts: [{ text: `${ctx.systemPrompt}\n\n${prompt}` }] }], config: { temperature: 0.15, responseMimeType: 'application/json', maxOutputTokens: 700 } });
    const parsed = JSON.parse(res.text || '{}');
    return Array.isArray(parsed?.actions) ? parsed.actions : [];
  } catch (e) {
    console.warn('Direct memory extraction error:', e);
    return [];
  }
}

export async function runDirectMemoryMaintenance(apiKey: string, memories: MemoryItem[], userName: string): Promise<{ actions: any[]; summary: string }> {
  if (!apiKey || !apiKey.trim()) return { actions: [], summary: 'No API key provided.' };
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const ctx = await buildInCharacterUtilityContext();
    const formattedList = memories.map((m) => `[ID: ${m.id}] [Category: ${m.category}] [Importance: ${m.importance}] [Confidence: ${m.confidence}] "${m.content}"`).join('\n');
    const prompt = `Using the system/persona above, audit Elara's long-term memory notebook without breaking character. Identify duplicate, stale, contradictory, or superseded notes. Return ONLY valid JSON: {"summary":"Brief 1-2 sentence explanation of maintenance performed","actions":[{"type":"DELETE"|"UPDATE","targetId":"ID","memory":{"content":"updated concise text if updating","importance":"core|important|normal|low","confidence":"certain|likely|uncertain","category":"User|Elara|Relationship|Home|Work|Projects|Preferences|People|Places|Experiences|Observations|Plans|Other"},"reason":"why"}]}`;
    const res = await ai.models.generateContent({ model: normalizeModel(ctx.model), contents: [{ role: 'user', parts: [{ text: `${ctx.systemPrompt}\n\n${prompt}\n\nMEMORIES:\n${formattedList}\n\nUSER: ${userName || ctx.userName}` }] }], config: { temperature: 0.15, responseMimeType: 'application/json' } });
    const parsed = JSON.parse(res.text || '{}');
    return { actions: parsed?.actions || [], summary: parsed?.summary || 'Memory notebook audit complete.' };
  } catch (e) {
    console.warn('Direct memory audit error:', e);
    return { actions: [], summary: 'Audit failed.' };
  }
}
