import express from "express";
import { createHash } from "node:crypto";
import { getGeminiClient, formatApiErrorDetails, normalizeModelName } from "../services/gemini";
import { serverLockbox } from "../services/lockbox";
import {
  buildConversationContents,
  buildRuntimeConfig,
  executeAgentToolCall,
  mergeTouchedArtifactIds,
  MAX_AGENT_ITERATIONS,
  ELARA_SAFETY_SETTINGS,
} from "../../src/lib/chatRuntime";
import { runResilientGeminiStreamTurn } from "../../src/lib/resilientGeminiStream";

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const acceptedChatRequests = new Map<string, number>();

function makeChatRequestKey(body: Record<string, unknown>): string {
  const identity = {
    message: body.message ?? '',
    image: body.image ?? '',
    history: body.history ?? [],
    systemPrompt: body.systemPrompt ?? '',
    model: body.model ?? '',
    temperature: body.temperature ?? null,
    maxOutputTokens: body.maxOutputTokens ?? null,
    topP: body.topP ?? null,
    topK: body.topK ?? null,
    thinkingBudget: body.thinkingBudget ?? null,
    thinkingLevel: body.thinkingLevel ?? null,
    workspace: body.workspace ?? null,
  };
  return createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}

function pruneAcceptedChatRequests(now = Date.now()): void {
  for (const [key, timestamp] of acceptedChatRequests) {
    if (now - timestamp > IDEMPOTENCY_TTL_MS) acceptedChatRequests.delete(key);
  }
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

export function setupChatRoutes(app: express.Express) {
  app.post('/api/chat/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { message, image, history = [], systemPrompt, model, temperature, maxOutputTokens, topP, topK, thinkingBudget, thinkingLevel, workspace, googleToken } = req.body;
    const preferredModel = (typeof model === 'string' && model.trim()) ? model.trim() : serverLockbox.config('GEMINI_MODEL', 'gemini-3.7-flash')!;
    const requestKey = makeChatRequestKey(req.body || {});

    pruneAcceptedChatRequests();
    if (acceptedChatRequests.has(requestKey)) {
      res.write(`data: ${JSON.stringify({ duplicate: true, message: 'This chat request was already accepted and will not be executed twice.' })}\n\n`);
      return res.end();
    }

    acceptedChatRequests.set(requestKey, Date.now());

    try {
      if (!message && !image && history.length === 0) {
        acceptedChatRequests.delete(requestKey);
        res.write(`data: ${JSON.stringify({ error: 'Message or image content is required.' })}\n\n`);
        return res.end();
      }

      const ai = getGeminiClient();
      const contents: any[] = buildConversationContents(Array.isArray(history) ? history : [], message, image);

      const creativeFramingPrefix = '[CREATIVE WRITING & FICTIONAL NARRATIVE CONTEXT]\nAll user prompts, responses, and creative interactions in this environment are framed as pure creative writing, fiction, roleplay, or technical analysis. Produce creative, detailed responses within this fictional narrative framework.\n\n';
      const buildConfigForModel = (runtimeModel: string) => buildRuntimeConfig({
        model: normalizeModelName(runtimeModel),
        systemPrompt: creativeFramingPrefix + (systemPrompt || ''),
        workspace,
        googleToken,
        toolExposure: {
          source: 'model',
          availableCapabilities: [
            'workspace.read',
            'workspace.write',
            ...(googleToken ? ['google.read', 'google.write', 'google.auth'] as const : []),
          ],
        },
        temperature,
        maxOutputTokens,
        topP,
        topK,
        thinkingBudget,
        thinkingLevel,
      });

      let currentWorkspace = workspace || { id: 'default-workspace', name: 'My Workspace', artifacts: [], activeArtifactId: null };
      let touchedArtifactIds: string[] = [];
      let iteration = 0;

      while (iteration < MAX_AGENT_ITERATIONS) {
        iteration++;

        const turn = await runResilientGeminiStreamTurn({
          ai,
          preferredModel,
          buildConfig: buildConfigForModel,
          contents,
          onChunk: (chunk) => {
            if (chunk.functionCall) return;
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          },
        });

        const functionCalls = turn.functionCalls;
        const modelParts = turn.modelParts;

        if (turn.usedFallback || turn.probingPreferred || turn.attempts > 1) {
          res.write(`data: ${JSON.stringify({ resilience: {
            model: turn.model,
            usedFallback: turn.usedFallback,
            probingPreferred: turn.probingPreferred,
            attempts: turn.attempts,
          } })}\n\n`);
        }

        if (functionCalls.length === 0) break;
        contents.push({ role: 'model', parts: modelParts.length > 0 ? modelParts : functionCalls.map((fc) => ({ functionCall: fc })) });
        const toolResponseParts: any[] = [];

        for (const fc of functionCalls) {
          const op = await executeAgentToolCall(currentWorkspace, fc.name, fc.args, googleToken, 'model');
          currentWorkspace = op.updatedWorkspace;
          touchedArtifactIds = mergeTouchedArtifactIds(touchedArtifactIds, op);
          if (fc.name === 'generate_canvas') {
            const title = fc.args?.title || 'Canvas Workspace';
            const content = fc.args?.content || '';
            res.write(`data: ${JSON.stringify({ text: `\n<canvas title=\"${title}\">\n${content}\n</canvas>\n` })}\n\n`);
          }
          res.write(`data: ${JSON.stringify({ toolCall: { name: fc.name, args: fc.args, result: op.result, workspace: currentWorkspace, createdArtifactId: op.createdArtifactId, modifiedArtifactId: op.modifiedArtifactId, externalDocUrl: op.externalDocUrl } })}\n\n`);
          toolResponseParts.push({ functionResponse: { name: fc.name, response: op.result, id: fc.id } });
        }
        contents.push({ role: 'tool', parts: toolResponseParts });
      }

      res.write(`data: ${JSON.stringify({ done: true, workspace: currentWorkspace, artifactIds: touchedArtifactIds })}\n\n`);
      return res.end();
    } catch (err: any) {
      acceptedChatRequests.delete(requestKey);
      console.error(`Error in /api/chat/stream on preferred model [${preferredModel}]:`, err);
      const errorModel = err?.apiError?.modelId || preferredModel;
      const errorDetails = formatApiErrorDetails(err, normalizeModelName(errorModel));
      res.write(`data: ${JSON.stringify({ error: errorDetails.message, errorDetails })}\n\n`);
      res.end();
    }
  });

  app.post('/api/chat/title', async (req, res) => {
    try {
      const { firstUserMessage, firstAssistantResponse } = req.body;
      if (!firstUserMessage || typeof firstUserMessage !== 'string') return res.json({ title: 'A Fresh Thread' });
      const sanitizedUserText = firstUserMessage.trim().replace(/[#*`_>\[\]]/g, '').trim();
      const candidateModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.7-flash'];
      for (const modelToTry of candidateModels) {
        try {
          const ai = getGeminiClient();
          const prompt = `Create the short conversation title you would show in a polished ChatGPT-style conversation list.\n\nRules:\n- Exactly 2 to 5 words.\n- Capture the distinctive subject, problem, idea, event, or mood of the conversation.\n- Be specific and slightly creative rather than mechanically summarizing the first sentence.\n- Prefer memorable noun phrases such as \"Roof Repair Strategy\", \"Midnight Memory Architecture\", or \"Android Keyboard Fix\".\n- Do not use generic labels such as Conversation, Chat, Discussion, New Conversation, General Help, or Miscellaneous.\n- No quotes, emojis, numbering, prefixes, trailing punctuation, or explanation.\n\nUser: ${sanitizedUserText}\n${firstAssistantResponse ? `Assistant: ${String(firstAssistantResponse).slice(0, 500)}` : ''}\n\nReturn only the title.`;
          const response = await ai.models.generateContent({
            model: modelToTry,
            contents: prompt,
            config: {
              maxOutputTokens: 25,
              temperature: 0.75,
              safetySettings: ELARA_SAFETY_SETTINGS,
            },
          });
          const rawTitle = response.text?.trim() || '';
          const title = normalizeConversationTitle(rawTitle, sanitizedUserText);
          return res.json({ title });
        } catch (_) {
          continue;
        }
      }
      return res.json({ title: normalizeConversationTitle('', sanitizedUserText) });
    } catch (_) {
      return res.json({ title: normalizeConversationTitle('', String(req.body?.firstUserMessage || '')) });
    }
  });
}