import { GoogleGenAI } from '@google/genai';
import { Workspace, MemoryItem } from '../types';
import { workspaceToolDeclarations, executeAnyWorkspaceTool, buildWorkspaceContextPrompt } from './workspaceTools';
import { getModelProfile } from './modelRegistry';
import { classifyApiError } from './apiError';

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

function deriveThinkingLevel(explicitLevel: DirectStreamParams['thinkingLevel'], budget?: number): 'minimal' | 'low' | 'medium' | 'high' {
  if (explicitLevel) return explicitLevel;
  if (typeof budget !== 'number' || budget < 0) return 'medium';
  if (budget === 0) return 'minimal';
  if (budget <= 2048) return 'low';
  if (budget <= 6144) return 'medium';
  return 'high';
}

export async function runDirectGeminiStream(params: DirectStreamParams): Promise<void> {
  const { apiKey, model, systemPrompt, history = [], message, image, temperature, maxOutputTokens, topP, topK, thinkingBudget, thinkingLevel, workspace, googleToken, onChunk, signal } = params;
  if (!apiKey || !apiKey.trim()) throw new Error('Please enter your Gemini API Key in Settings (Model & API tab) to chat on GitHub Pages.');

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const contents: any[] = [];
  for (const h of history) {
    const parts: any[] = [];
    if (h.image) {
      const match = h.image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    if (h.content) parts.push({ text: h.content });
    if (parts.length > 0) contents.push({ role: h.role === 'assistant' ? 'model' : 'user', parts });
  }
  const currentParts: any[] = [];
  if (image) {
    const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (match) currentParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  }
  if (message) currentParts.push({ text: message });
  if (currentParts.length > 0) contents.push({ role: 'user', parts: currentParts });

  const workspaceContext = buildWorkspaceContextPrompt(workspace, Boolean(googleToken));
  const fullSystemInstruction = (systemPrompt || '') + '\n' + workspaceContext;
  const cleanModel = model.replace(/^models\//, '').trim() || 'gemini-3.7-flash';
  const profile = getModelProfile(cleanModel);
  const config: any = {};
  if (fullSystemInstruction.trim()) config.systemInstruction = fullSystemInstruction;
  if (typeof temperature === 'number') config.temperature = Math.min(profile.temperatureMax, Math.max(profile.temperatureMin, temperature));
  if (typeof maxOutputTokens === 'number') config.maxOutputTokens = Math.min(profile.maxOutputTokensMax, Math.max(profile.maxOutputTokensMin, maxOutputTokens));
  if (typeof topP === 'number') config.topP = Math.min(profile.topPMax, Math.max(profile.topPMin, topP));
  if (typeof topK === 'number') config.topK = Math.min(profile.topKMax, Math.max(profile.topKMin, topK));

  if (profile.thinkingControl === 'level') {
    let level = deriveThinkingLevel(thinkingLevel, thinkingBudget);
    if (!profile.thinkingLevels?.includes(level)) level = profile.thinkingLevels?.[0] || 'low';
    config.thinkingConfig = { thinkingLevel: level, includeThoughts: true };
  } else if (profile.thinkingControl === 'budget') {
    const budget = typeof thinkingBudget === 'number' ? thinkingBudget : -1;
    config.thinkingConfig = { thinkingBudget: budget, includeThoughts: true };
  }

  if (signal?.aborted) throw new Error('Aborted before starting');

  return new Promise<void>((resolve, reject) => {
    const handleAbort = () => reject(signal?.reason || new DOMException('Aborted', 'AbortError'));
    if (signal) {
      if (signal.aborted) return handleAbort();
      signal.addEventListener('abort', handleAbort);
    }
    (async () => {
      try {
        config.tools = [{ functionDeclarations: workspaceToolDeclarations }];
        let currentWorkspace: Workspace = workspace || { id: 'default-workspace', name: 'My Workspace', artifacts: [], activeArtifactId: null };
        const touchedArtifactIds: string[] = [];
        let iteration = 0;
        const MAX_ITERATIONS = 5;

        while (iteration < MAX_ITERATIONS) {
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
            const op = await executeAnyWorkspaceTool(currentWorkspace, fc.name, fc.args, googleToken);
            currentWorkspace = op.updatedWorkspace;
            if (op.createdArtifactId) touchedArtifactIds.push(op.createdArtifactId);
            if (op.modifiedArtifactId) touchedArtifactIds.push(op.modifiedArtifactId);
            if (fc.name === 'generate_canvas') {
              const title = fc.args?.title || 'Canvas Workspace';
              const content = fc.args?.content || '';
              onChunk({ text: `\n<canvas title="${title}">\n${content}\n</canvas>\n` });
            }
            onChunk({
              toolCall: { name: fc.name, args: fc.args, result: op.result, workspace: currentWorkspace, createdArtifactId: op.createdArtifactId, modifiedArtifactId: op.modifiedArtifactId, externalDocUrl: op.externalDocUrl },
              workspace: currentWorkspace,
              artifactIds: Array.from(new Set(touchedArtifactIds)),
            });
            toolResponseParts.push({ functionResponse: { name: fc.name, response: op.result, id: fc.id } });
          }
          contents.push({ role: 'tool', parts: toolResponseParts });
        }

        onChunk({ workspace: currentWorkspace, artifactIds: Array.from(new Set(touchedArtifactIds)) });
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

export async function runDirectTitleGeneration(apiKey: string, firstUserMsg: string, firstAssistantMsg: string): Promise<string> {
  if (!apiKey || !apiKey.trim()) return 'New Conversation';
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const prompt = `Generate a very brief, elegant title (maximum 4-5 words) summarizing this conversation start. Do not use quotes or prefixes.\nUser: ${firstUserMsg.slice(0, 150)}\nAssistant: ${firstAssistantMsg.slice(0, 150)}\nTitle:`;
    const res = await ai.models.generateContent({ model: 'gemini-3.5-flash', contents: prompt, config: { maxOutputTokens: 20, temperature: 0.7 } });
    const title = res.text?.trim().replace(/^["']|["']$/g, '');
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
    const formattedExisting = currentMemories?.length ? currentMemories.slice(0, 30).map((m: any) => `[ID: ${m.id}] [Category: ${m.category}] [Confidence: ${m.confidence}] "${m.content}"`).join('\n') : 'No existing memories recorded yet.';
    const prompt = `You are Elara's Autonomous Memory Extraction Engine.\nAnalyze this recent interaction between [[user]] (${userName}) and Elara to determine if any new note should be created, updated, merged, or deleted in her long-term notebook.\n\nRECENT INTERACTION:\nUser: "${userMessage.slice(0, 1000)}"\nElara: "${assistantResponse.slice(0, 1500)}"\n\nCURRENT NOTEBOOK MEMORIES:\n${formattedExisting}\n\nReturn ONLY valid JSON matching this schema: {"actions":[{"type":"CREATE"|"UPDATE"|"DELETE","targetId":"string","memory":{"content":"concise, fact-based memory note","category":"User|Elara|Relationship|Home|Work|Projects|Preferences|People|Places|Experiences|Observations|Plans|Other","importance":"core|important|normal|low","confidence":"certain|likely|uncertain","isPrivate":true,"tags":["string"],"eventDate":"optional YYYY-MM-DD"},"reason":"brief reason"}]}`;
    const res = await ai.models.generateContent({ model: 'gemini-3.5-flash', contents: prompt, config: { temperature: 0.2, responseMimeType: 'application/json' } });
    const parsed = JSON.parse(res.text || '{}');
    return parsed?.actions || [];
  } catch (e) {
    console.warn('Direct memory extraction error:', e);
    return [];
  }
}

export async function runDirectMemoryMaintenance(apiKey: string, memories: MemoryItem[], userName: string): Promise<{ actions: any[]; summary: string }> {
  if (!apiKey || !apiKey.trim()) return { actions: [], summary: 'No API key provided.' };
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const formattedList = memories.map((m) => `[ID: ${m.id}] [Category: ${m.category}] [Importance: ${m.importance}] [Confidence: ${m.confidence}] "${m.content}"`).join('\n');
    const prompt = `You are Elara's Long-Term Memory Notebook Auditor.\nReview the following memories about [[user]] (${userName}) and Elara.\nIdentify any duplicate notes, superseded facts, or notes that should be merged.\n\nMEMORIES LIST:\n${formattedList}\n\nReturn ONLY valid JSON: {"summary":"Brief 1-2 sentence explanation of maintenance performed","actions":[{"type":"DELETE"|"UPDATE","targetId":"ID","memory":{"content":"updated concise text if updating","importance":"core|important|normal|low","confidence":"certain|likely|uncertain","category":"User|Elara|Relationship|Home|Work|Projects|Preferences|People|Places|Experiences|Observations|Plans|Other"},"reason":"why"}]}`;
    const res = await ai.models.generateContent({ model: 'gemini-3.5-flash', contents: prompt, config: { temperature: 0.2, responseMimeType: 'application/json' } });
    const parsed = JSON.parse(res.text || '{}');
    return { actions: parsed?.actions || [], summary: parsed?.summary || 'Memory notebook audit complete.' };
  } catch (e) {
    console.warn('Direct memory audit error:', e);
    return { actions: [], summary: 'Audit failed.' };
  }
}
