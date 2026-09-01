import { GoogleGenAI } from '@google/genai';
import { Workspace, MemoryItem } from '../types';
import { classifyApiError } from './apiError';
import { getDbSettings } from './db';
import { loadUserProfileNotes, loadActiveScratchpad, buildSystemPayload } from './contextManager';
import { DEFAULT_PERSONA_PROTOCOL, DEFAULT_INTIMACY_MODULE, DEFAULT_RUNTIME_RULES } from '../constants/defaultPrompt';
import { runResilientGeminiStreamTurn } from './resilientGeminiStream';
import {
  buildConversationContents,
  buildRuntimeConfig,
  MAX_AGENT_ITERATIONS,
  normalizeModel,
  ELARA_SAFETY_SETTINGS,
} from './chatRuntime';
import { executeAgentToolCall } from '../services/agentToolExecutionService';
import { mergeTouchedArtifactIds } from '../services/agentToolExecutionService';

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
  /** Normal Chat keeps tool execution enabled; specialised runtime callers can explicitly disable it. */
  enableTools?: boolean;
  onChunk: (chunk: { text?: string; thoughtText?: string; thoughtType?: 'summary'; finishReason?: string; safetyRatings?: any; toolCall?: any; workspace?: Workspace; artifactIds?: string[] }) => void;
  signal?: AbortSignal;
}

export async function runDirectGeminiStream(params: DirectStreamParams): Promise<void> {
  const { apiKey, model, systemPrompt, history = [], message, image, temperature, maxOutputTokens, topP, topK, thinkingBudget, thinkingLevel, workspace, googleToken, enableTools = true, onChunk, signal } = params;
  if (!apiKey || !apiKey.trim()) throw new Error('Please enter your Gemini API Key in Settings (Model & API tab) to chat on GitHub Pages.');

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const contents: any[] = buildConversationContents(history, message, image);
  const preferredModel = normalizeModel(model);

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

          const turn = await runResilientGeminiStreamTurn({
            ai,
            preferredModel,
            buildConfig: (runtimeModel) => buildRuntimeConfig({
              model: runtimeModel,
              systemPrompt,
              workspace,
              googleToken,
              temperature,
              maxOutputTokens,
              topP,
              topK,
              thinkingBudget,
              thinkingLevel,
              enableTools,
            }),
            contents,
            signal,
            onChunk: (chunk) => onChunk(chunk),
          });

          const functionCalls = enableTools ? turn.functionCalls : [];
          const modelParts = turn.modelParts;

          if (functionCalls.length === 0 || signal?.aborted) break;
          if (modelParts.length === 0) {
            const error = new Error('Gemini returned function calls without their original model response parts; refusing to reconstruct a signature-bearing Gemini 3 tool turn.');
            (error as any).apiError = {
              code: 'INVALID_REQUEST_400',
              httpStatus: 400,
              modelId: preferredModel,
              message: 'Gemini 3 tool history could not be preserved exactly because the original model response parts were unavailable.',
              retryable: false,
              rawMessage: error.message,
            };
            throw error;
          }
          contents.push({ role: 'model', parts: modelParts });
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
        const classified = classifyApiError(err, preferredModel);
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

function normalizeConversationTitle(raw: string, fallbackSource: string): string {
  const generic = /^(new conversation|new chat|conversation|chat|discussion|untitled|general discussion|miscellaneous)$/i;
  const cleaned = raw
    .replace(/^[\"'`]+|[\"'`]+$/g, '')
    .replace(/^(title|conversation title)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 5 && !generic.test(cleaned)) return cleaned;

  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'for', 'in', 'on', 'with', 'is', 'it', 'this', 'that', 'i', 'me', 'my', 'we', 'you', 'can', 'please', 'help', 'about']);
  const fallbackWords = fallbackSource
    .replace(/[#*`_>\[\]]/g, ' ')
    .replace(/[^\p{L}\p{N}'-]+/gu, ' ')
    .split(/\s+/)
    .filter((word) => word && !stopWords.has(word.toLowerCase()))
    .slice(0, 5);
  if (fallbackWords.length >= 2) {
    return fallbackWords.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
  return 'A Fresh Thread';
}

export async function runDirectTitleGeneration(apiKey: string, firstUserMsg: string, firstAssistantMsg: string): Promise<string> {
  if (!apiKey || !apiKey.trim()) return 'A Fresh Thread';
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const ctx = await buildInCharacterUtilityContext();
    const prompt = `Using the system/persona above, act as Elara and create the short title she would show in a polished ChatGPT-style conversation list.\n\nRules:\n- Exactly 2 to 5 words.\n- Capture the distinctive subject, problem, idea, event, or mood.\n- Be specific and slightly creative rather than mechanically summarizing the first sentence.\n- Prefer memorable noun phrases such as \"Roof Repair Strategy\", \"Midnight Memory Architecture\", or \"Android Keyboard Fix\".\n- Never use generic labels such as Conversation, Chat, Discussion, New Conversation, General Help, or Miscellaneous.\n- No quotes, emojis, numbering, prefixes, trailing punctuation, or explanation.\n\nConversation opening:\nUser: ${firstUserMsg.slice(0, 500)}\nElara: ${firstAssistantMsg.slice(0, 700)}\n\nReturn only the title.`;
    const res = await ai.models.generateContent({
      model: normalizeModel(ctx.model),
      contents: [{ role: 'user', parts: [{ text: `${ctx.systemPrompt}\n\n${prompt}` }] }],
      config: {
        maxOutputTokens: 30,
        temperature: 0.75,
        safetySettings: ELARA_SAFETY_SETTINGS,
      },
    });
    return normalizeConversationTitle(res.text?.trim() || '', firstUserMsg);
  } catch (e) {
    console.warn('Direct title generation error:', e);
    return normalizeConversationTitle('', firstUserMsg);
  }
}

export async function runDirectMemoryExtraction(apiKey: string, userMessage: string, assistantResponse: string, currentMemories: MemoryItem[], userName: string): Promise<any[]> {
  if (!apiKey || !apiKey.trim()) return [];
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const ctx = await buildInCharacterUtilityContext();
    const formattedExisting = currentMemories?.length
      ? currentMemories.slice(0, 40).map((m) => `[ID: ${m.id}] [Resolution: ${m.resolution || 'contextual'}] [Kind: ${m.kind || 'context'}] [Lifecycle: ${m.lifecycle || 'persistent'}] [Category: ${m.category}] [State: ${m.state || 'active'}] [Confidence: ${m.confidence}] [Importance: ${m.importance}] \"${m.content}\"`).join('\n')
      : 'No existing memories recorded yet.';
    const prompt = `Using the system/persona above, maintain Elara's memory as a quiet stream of small, useful observations.\n\nThe first job here is NOT to decide what becomes permanent memory. Instead, notice potentially useful details revealed by the interaction and capture them as atomic observations that can be evaluated, reinforced, contradicted, promoted, or allowed to become stale later.\n\nGood observations include small facts about the user's circumstances, current activities, projects, plans, preferences, routines, interests, relationships, purchases, places, worries, decisions, or one-off events that could become relevant in a later conversation. A detail does not need to be important today to be worth recording. The point is to preserve useful dots and let later memory passes decide which dots form durable patterns.\n\nWrite notes as natural, human-readable observations in Elara's own voice, not database labels and not robotic telemetry. Prefer a concise complete sentence that records the meaning rather than merely repeating a quote.\n\nDo not invent facts. Do not infer sensitive traits from weak evidence. Do not diagnose, speculate about, or permanently assign identities, beliefs, politics, religion, health, sexuality, ethnicity, or other sensitive traits merely from implication. Do not record credentials, secrets, passwords, API keys, financial credentials, or other authentication material. Do not turn a fleeting emotional statement into a stable personality trait.\n\nCREATE an observation when a detail is reasonably grounded in what the user actually said or did. UPDATE an existing note when the interaction clearly provides a newer or more precise version of the same observation. Prefer NO_ACTION when there is genuinely nothing useful to preserve.\n\nFor this pass, newly created observations MUST use resolution=observation and state=active. Keep their lifecycle contextual or working as appropriate; do not promote observations directly to core or persistent memory. Use low or normal importance unless the user explicitly indicates that the detail matters more. Confidence should reflect the evidence actually present in the interaction.\n\nReturn ONLY valid JSON using this schema: {\"actions\":[{\"type\":\"CREATE\"|\"UPDATE\"|\"NO_ACTION\",\"targetId\":\"existing ID when updating\",\"memory\":{\"content\":\"natural-language observation in Elara's voice\",\"kind\":\"fact|preference|observation|episode|project|relationship|plan|working|context\",\"lifecycle\":\"working|contextual|persistent|core\",\"source\":\"user|elara|conversation|artifact|system|imported\",\"category\":\"User|Elara|Relationship|Home|Work|Projects|Preferences|People|Places|Experiences|Observations|Plans|Other\",\"importance\":\"core|important|normal|low\",\"confidence\":\"certain|likely|uncertain\",\"isPrivate\":true,\"tags\":[\"string\"],\"eventDate\":\"optional YYYY-MM-DD\",\"expiresAt\":\"optional ISO timestamp\",\"sourceArtifactId\":\"optional artifact id\",\"relatedMemoryIds\":[\"optional ids\"]},\"reason\":\"brief reason\"}]} .\n\nRECENT INTERACTION:\nUser: \"${userMessage.slice(0, 1400)}\"\nElara: \"${assistantResponse.slice(0, 2200)}\"\n\nCURRENT NOTEBOOK:\n${formattedExisting}\n\nUSER NAME: ${userName || ctx.userName}`;
    const res = await ai.models.generateContent({
      model: normalizeModel(ctx.model),
      contents: [{ role: 'user', parts: [{ text: `${ctx.systemPrompt}\n\n${prompt}` }] }],
      config: {
        temperature: 0.15,
        responseMimeType: 'application/json',
        maxOutputTokens: 1000,
        safetySettings: ELARA_SAFETY_SETTINGS,
      },
    });
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
    const formattedList = memories.map((m) => `[ID: ${m.id}] [Resolution: ${m.resolution || 'contextual'}] [Kind: ${m.kind || 'context'}] [Lifecycle: ${m.lifecycle || 'persistent'}] [State: ${m.state || 'active'}] [Category: ${m.category}] [Importance: ${m.importance}] [Confidence: ${m.confidence}] \"${m.content}\"`).join('\n');
    const prompt = `Using the system/persona above, audit Elara's long-term memory notebook without breaking character. Look for genuinely duplicate notes, stale working/context material, contradictions, and notes that should be strengthened or weakened because newer information supersedes them. Preserve core and pinned memories. Do not delete solely because a memory is old; prefer an UPDATE or NO_ACTION when uncertain. Return ONLY valid JSON: {\"summary\":\"Brief 1-2 sentence explanation of maintenance performed\",\"actions\":[{\"type\":\"DELETE\"|\"UPDATE\"|\"MERGE\"|\"NO_ACTION\",\"targetId\":\"ID\",\"mergeTargetIds\":[\"optional ids\"],\"memory\":{\"content\":\"updated natural-language note if updating\",...}}]}.\n\nMEMORY NOTEBOOK:\n${formattedList}\n\nUSER NAME: ${userName || ctx.userName}`;
    const res = await ai.models.generateContent({
      model: normalizeModel(ctx.model),
      contents: [{ role: 'user', parts: [{ text: `${ctx.systemPrompt}\n\n${prompt}` }] }],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        maxOutputTokens: 2000,
        safetySettings: ELARA_SAFETY_SETTINGS,
      },
    });
    const parsed = JSON.parse(res.text || '{}');
    return { actions: Array.isArray(parsed?.actions) ? parsed.actions : [], summary: typeof parsed?.summary === 'string' ? parsed.summary : 'Memory maintenance completed.' };
  } catch (e) {
    console.warn('Direct memory maintenance error:', e);
    return { actions: [], summary: 'Memory maintenance could not be completed.' };
  }
}
