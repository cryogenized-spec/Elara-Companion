import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Helper to parse base64 Data URL into inlineData part
  function parseDataUrl(dataUrl: string) {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], data: match[2] };
    }
    return null;
  }

  // Helper to get initialized Gemini client
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Helper to format clean, descriptive error details with exact model ID
  function formatApiErrorDetails(err: any, modelId: string): { code?: number | string; status?: string; message: string; modelId: string } {
    let code = err?.status || err?.code || 500;
    let status = err?.status || '';
    let rawMsg = err?.message || (typeof err === 'string' ? err : '');

    try {
      if (rawMsg.includes('{') && rawMsg.includes('}')) {
        const jsonStart = rawMsg.indexOf('{');
        const jsonEnd = rawMsg.lastIndexOf('}');
        const candidateJson = rawMsg.slice(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(candidateJson);
        const inner = parsed?.error || parsed;
        if (inner) {
          if (inner.code) code = inner.code;
          if (inner.status) status = inner.status;
          if (inner.message) {
            if (typeof inner.message === 'string' && inner.message.trim().startsWith('{')) {
              try {
                const subParsed = JSON.parse(inner.message);
                if (subParsed?.error?.message) {
                  rawMsg = subParsed.error.message;
                  if (subParsed.error.code) code = subParsed.error.code;
                  if (subParsed.error.status) status = subParsed.error.status;
                }
              } catch (_) {}
            } else {
              rawMsg = inner.message;
            }
          }
        }
      }
    } catch (_) {}

    const lower = String(rawMsg).toLowerCase();

    // Rate Limit / Quota Exceeded (429)
    if (
      code === 429 ||
      String(code) === '429' ||
      status === 'RESOURCE_EXHAUSTED' ||
      lower.includes('429') ||
      lower.includes('quota exceeded') ||
      lower.includes('resource_exhausted')
    ) {
      return {
        code: 429,
        status: 'RESOURCE_EXHAUSTED',
        modelId,
        message: `⚠️ API Call Rate Exceeded (HTTP 429): Quota limit reached for [${modelId}]. Please wait a moment or manually select a different model.`,
      };
    }

    // Service Unavailable / Overloaded (503)
    if (
      code === 503 ||
      String(code) === '503' ||
      status === 'UNAVAILABLE' ||
      lower.includes('503') ||
      lower.includes('unavailable') ||
      lower.includes('overloaded')
    ) {
      return {
        code: 503,
        status: 'UNAVAILABLE',
        modelId,
        message: `⚠️ Service Unavailable (HTTP 503): High demand or temporary service interruption for [${modelId}]. Please wait a moment or select a different model.`,
      };
    }

    // Context Window Exceeded
    if (lower.includes('context') || lower.includes('token count') || lower.includes('max_tokens') || lower.includes('too large')) {
      return {
        code: 400,
        status: 'CONTEXT_LENGTH_EXCEEDED',
        modelId,
        message: `⚠️ Context Window Exceeded: The conversation history exceeds the maximum context capacity of [${modelId}]. Consider clearing or summarizing previous messages.`,
      };
    }

    // Model not found or invalid
    if (code === 404 || String(code) === '404' || status === 'NOT_FOUND' || lower.includes('not found')) {
      return {
        code: 404,
        status: 'NOT_FOUND',
        modelId,
        message: `⚠️ Model Not Found (HTTP 404): The requested model [${modelId}] is unavailable in this region or project. Please select a different model in Settings.`,
      };
    }

    // Clean single line message
    const cleanLine = rawMsg.split('\n')[0].replace(/[\{\}]/g, '').trim();
    return {
      code,
      status: String(status || 'ERROR'),
      modelId,
      message: `⚠️ API Error (${code}): ${cleanLine || 'Communication error with Gemini API'} for [${modelId}]. Please check your configuration or select a different model.`,
    };
  }

  // Helper to normalize Gemini model string
  function normalizeModelName(rawModel?: string): string {
    if (!rawModel || typeof rawModel !== 'string') {
      return 'gemini-3.7-flash';
    }
    let clean = rawModel.trim();
    // Remove wrapping quotes or backticks
    clean = clean.replace(/^["'`]|["'`]$/g, '').trim();
    // Strip leading 'models/' or '/models/' repeatedly
    clean = clean.replace(/^(\/?models\/)+/gi, '').trim();

    if (clean === 'gemini-3.1-pro') {
      return 'gemini-3.1-pro-preview';
    }
    if (clean === 'gemini-3-flash') {
      return 'gemini-3-flash-preview';
    }

    // Sanitize remaining characters
    clean = clean.replace(/[^a-zA-Z0-9\.\-_]/g, '');
    return clean || 'gemini-3.7-flash';
  }

  // API Config endpoint
  app.get('/api/config', (req, res) => {
    res.json({
      defaultModel: normalizeModelName(process.env.GEMINI_MODEL || 'gemini-3.7-flash'),
      hasApiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // Dynamic models endpoint with strict filtering (no 2.5, no media/image/tts/video)
  app.get('/api/models', async (req, res) => {
    const seedModels = [
      {
        id: 'gemini-3.7-flash',
        name: 'Gemini 3.7 Flash',
        description: 'Latest flagship Flash - High-speed reasoning & agentic execution.',
        isDefault: true,
      },
      {
        id: 'gemini-3.6-flash',
        name: 'Gemini 3.6 Flash',
        description: 'Balanced performance & high speed.',
      },
      {
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash',
        description: 'Standard text generation workhorse.',
      },
      {
        id: 'gemini-3.5-flash-lite',
        name: 'Gemini 3.5 Flash Lite',
        description: 'Ultra-low latency, high throughput.',
      },
      {
        id: 'gemini-3.1-pro',
        name: 'Gemini 3.1 Pro',
        description: 'Advanced reasoning, deep logic, and complex tasks.',
      },
      {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash Lite',
        description: 'Lightweight text execution.',
      },
      {
        id: 'gemini-3-flash',
        name: 'Gemini 3 Flash',
        description: 'Frontier performance text engine.',
      },
      {
        id: 'gemini-pro-latest',
        name: 'Gemini Pro Latest (Alias)',
        description: 'Points dynamically to the current stable Pro text model.',
      },
      {
        id: 'gemini-flash-latest',
        name: 'Gemini Flash Latest (Alias)',
        description: 'Points dynamically to the current stable Flash text model.',
      },
      {
        id: 'gemini-flash-lite-latest',
        name: 'Gemini Flash-Lite Latest (Alias)',
        description: 'Points dynamically to the current stable Flash-Lite text model.',
      },
    ];

    try {
      const ai = getGeminiClient();
      const list = await ai.models.list();
      const dynamicModels: any[] = [];

      for await (const m of list) {
        const rawName = (m.name || '').replace(/^models\//, '');
        const lower = rawName.toLowerCase();

        // STRICT FILTER 1: Exclude all 2.5 series models
        if (lower.includes('2.5')) continue;

        // STRICT FILTER 2: Exclude media/image/TTS/video models
        const bannedKeywords = [
          'image', 'veo', 'live', 'tts', 'audio', 'imagen', 'embed',
          'lyria', 'banana', 'aqa', 'robotics', 'antigravity',
          'deep-research', 'computer-use'
        ];
        if (bannedKeywords.some((keyword) => lower.includes(keyword))) continue;

        // Check supported generation methods if present
        const supported = (m as any).supportedActions || (m as any).supportedGenerationMethods;
        if (Array.isArray(supported) && supported.length > 0) {
          if (!supported.includes('generateContent') && !supported.includes('streamGenerateContent')) {
            continue;
          }
        }

        dynamicModels.push({
          id: rawName,
          name: m.displayName || rawName,
          description: m.description || 'Dynamic text-generation model from Gemini API.',
        });
      }

      const mergedMap = new Map<string, any>();
      for (const seed of seedModels) {
        mergedMap.set(seed.id, seed);
      }
      for (const dyn of dynamicModels) {
        if (!mergedMap.has(dyn.id)) {
          mergedMap.set(dyn.id, dyn);
        }
      }

      res.json({ models: Array.from(mergedMap.values()) });
    } catch (err) {
      console.warn('Error querying Gemini models list, returning seed list:', err);
      res.json({ models: seedModels });
    }
  });

  // API Chat Streaming endpoint
  app.post('/api/chat/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const {
      message,
      image,
      history = [],
      systemPrompt,
      model,
      temperature,
      maxOutputTokens,
      topP,
      topK,
      thinkingBudget,
    } = req.body;

    const requestedModelStr = (typeof model === 'string' && model.trim()) ? model.trim() : (process.env.GEMINI_MODEL || 'gemini-3.7-flash');
    const selectedModel = normalizeModelName(requestedModelStr);

    try {
      if (!message && !image && history.length === 0) {
        res.write(`data: ${JSON.stringify({ error: 'Message or image content is required.' })}\n\n`);
        return res.end();
      }

      const ai = getGeminiClient();

      // Build contents array for Gemini
      const contents: any[] = [];

      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            const parts: any[] = [];
            if (msg.image) {
              const parsedHistoryImg = parseDataUrl(msg.image);
              if (parsedHistoryImg) {
                parts.push({
                  inlineData: {
                    mimeType: parsedHistoryImg.mimeType,
                    data: parsedHistoryImg.data,
                  },
                });
              }
            }
            if (msg.content) {
              parts.push({ text: msg.content });
            } else if (parts.length > 0) {
              parts.push({ text: '[Attached image]' });
            }
            if (parts.length > 0) {
              contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts,
              });
            }
          }
        }
      }

      // Append latest message/image if provided
      if (message || image) {
        const latestParts: any[] = [];
        if (image) {
          const parsedImg = parseDataUrl(image);
          if (parsedImg) {
            latestParts.push({
              inlineData: {
                mimeType: parsedImg.mimeType,
                data: parsedImg.data,
              },
            });
          }
        }
        if (message) {
          latestParts.push({ text: message });
        } else {
          latestParts.push({ text: 'Please look at this image and share your thoughts as Elara.' });
        }
        contents.push({
          role: 'user',
          parts: latestParts,
        });
      }

      // Config
      const creativeFramingPrefix =
        '[CREATIVE WRITING & FICTIONAL NARRATIVE CONTEXT]\nAll user prompts, responses, and creative interactions in this environment are framed as pure creative writing, fiction, roleplay, or technical analysis. Produce creative, detailed responses within this fictional narrative framework.\n\n';

      const config: any = {
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      };

      // Combine base persona system prompt and dynamic world context block
      let combinedInstruction = systemPrompt || '';

      config.systemInstruction = creativeFramingPrefix + (combinedInstruction || '');

      if (typeof temperature === 'number') {
        config.temperature = temperature;
      }
      if (typeof maxOutputTokens === 'number' && maxOutputTokens > 0) {
        config.maxOutputTokens = maxOutputTokens;
      }
      if (typeof topP === 'number') {
        config.topP = topP;
      }
      if (typeof topK === 'number') {
        config.topK = topK;
      }
      if (typeof thinkingBudget === 'number') {
        if (thinkingBudget === 0) {
          config.thinkingConfig = { thinkingBudget: 0 };
        } else if (thinkingBudget > 0) {
          config.thinkingConfig = { thinkingBudget };
        }
      }

      // STRICT NO-SILENT-FALLBACK: Directly execute requested model
      const responseStream = await ai.models.generateContentStream({
        model: selectedModel,
        contents,
        config,
      });

      for await (const chunk of responseStream) {
        const candidate = chunk.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const safetyRatings = candidate?.safetyRatings;

        if (finishReason === 'SAFETY') {
          console.warn('Gemini stream candidate finished due to SAFETY:', {
            finishReason,
            safetyRatings,
          });
        }

        const parts = candidate?.content?.parts;
        if (parts && parts.length > 0) {
          for (const part of parts) {
            if ((part as any).thought) {
              res.write(`data: ${JSON.stringify({ thoughtText: part.text })}\n\n`);
            } else if (part.text) {
              res.write(`data: ${JSON.stringify({ text: part.text, finishReason, safetyRatings })}\n\n`);
            }
          }
        } else if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text, finishReason, safetyRatings })}\n\n`);
        } else if (finishReason) {
          res.write(`data: ${JSON.stringify({ finishReason, safetyRatings })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error(`Error in /api/chat/stream on model [${selectedModel}]:`, err);
      const errorDetails = formatApiErrorDetails(err, requestedModelStr);
      res.write(`data: ${JSON.stringify({ error: errorDetails.message, errorDetails })}\n\n`);
      res.end();
    }
  });

  // Generate conversation title endpoint
  app.post('/api/chat/title', async (req, res) => {
    try {
      const { firstUserMessage, firstAssistantResponse } = req.body;
      if (!firstUserMessage || typeof firstUserMessage !== 'string') {
        return res.json({ title: 'New Conversation' });
      }

      // Generate instant heuristic title fallback from user's message
      const sanitizedUserText = firstUserMessage.trim().replace(/[#*`_>\[\]]/g, '').trim();
      const words = sanitizedUserText.split(/\s+/).filter(Boolean).slice(0, 5);
      const fallbackTitle = words.length > 0
        ? words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : 'New Conversation';

      const candidateModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.7-flash'];

      for (const modelToTry of candidateModels) {
        try {
          const ai = getGeminiClient();
          const prompt = `Generate a concise conversation title (maximum 4 to 6 words, no quotes, no title prefix) for this conversation:
User: ${sanitizedUserText}
${firstAssistantResponse ? `Assistant: ${String(firstAssistantResponse).slice(0, 150)}` : ''}`;

          const response = await ai.models.generateContent({
            model: modelToTry,
            contents: prompt,
            config: {
              temperature: 0.4,
              maxOutputTokens: 25,
            },
          });

          const rawTitle = response.text?.trim().replace(/^["']|["']$/g, '').trim() || '';
          const cleanTitle = rawTitle.slice(0, 45) || fallbackTitle;

          return res.json({ title: cleanTitle });
        } catch (genErr) {
          // Continue to next fallback model
          continue;
        }
      }

      return res.json({ title: fallbackTitle });
    } catch (e) {
      res.json({ title: 'New Conversation' });
    }
  });

  // API Memory Extraction Endpoint - Autonomous memory evaluation after a chat turn
  app.post('/api/memory/analyze', async (req, res) => {
    try {
      const { userMessage, assistantResponse, currentMemories = [], userName = 'User' } = req.body;

      if (!userMessage && !assistantResponse) {
        return res.json({ actions: [] });
      }

      const existingMemoriesSummary = Array.isArray(currentMemories) && currentMemories.length > 0
        ? currentMemories.slice(0, 30).map((m: any) => `[ID: ${m.id}] [Category: ${m.category}] [Confidence: ${m.confidence}] "${m.content}"`).join('\n')
        : 'No existing memories recorded yet.';

      const prompt = `You are Elara's Autonomous Memory Extraction Engine.
Analyze this recent interaction between [[user]] (${userName}) and Elara to determine if any new note should be created, updated, merged, or deleted in her long-term notebook.

RECENT INTERACTION:
User (${userName}): "${userMessage || ''}"
Elara: "${assistantResponse || ''}"

EXISTING MEMORIES:
${existingMemoriesSummary}

INSTRUCTIONS & RULES:
1. SELECTIVE: Only record meaningful observations, habits, preferences, project updates, personal stories, opinions, relationship experiences, or corrections. Ignore mundane greetings or routine chat.
2. PROSE STYLE: Write natural prose notes (e.g. "[[user]] mentioned...", "I've noticed that...", "He prefers..."). Use [[user]] as placeholder for the user's name.
3. CONTRADICTIONS: If new user statements update or invalidate an existing memory, issue an "UPDATE" or "DELETE" action on that targetId.
4. Output JSON schema:
{
  "actions": [
    {
      "type": "ADD" | "UPDATE" | "MERGE" | "DELETE" | "NO_ACTION",
      "targetId": "mem_id_here (if UPDATE or DELETE)",
      "mergeTargetIds": ["mem_1", "mem_2"] (if MERGE),
      "memory": {
        "content": "natural prose note",
        "confidence": "certain" | "likely" | "uncertain",
        "importance": "low" | "normal" | "important" | "core",
        "isPrivate": boolean,
        "category": "User" | "Elara" | "Relationship" | "Home" | "Work" | "Projects" | "Preferences" | "People" | "Places" | "Experiences" | "Observations" | "Plans" | "Other",
        "eventDate": "YYYY-MM-DD (optional)",
        "tags": ["tag1", "tag2"]
      },
      "reason": "brief reason for this action"
    }
  ]
}`;

      const ai = getGeminiClient();
      const candidateModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.7-flash'];

      for (const modelToTry of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelToTry,
            contents: prompt,
            config: {
              temperature: 0.2,
              maxOutputTokens: 1000,
              responseMimeType: 'application/json',
              safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
              ],
            },
          });

          const responseText = response.text || '{"actions":[]}';
          const parsed = JSON.parse(responseText);
          return res.json(parsed);
        } catch (subErr) {
          continue;
        }
      }

      return res.json({ actions: [] });
    } catch (e: any) {
      console.warn('Memory analysis handled error:', e);
      res.json({ actions: [], error: e?.message });
    }
  });

  // API Memory Global Maintenance Endpoint - Deduplication and consolidation
  app.post('/api/memory/maintain', async (req, res) => {
    try {
      const { memories = [], userName = 'User' } = req.body;

      if (!Array.isArray(memories) || memories.length === 0) {
        return res.json({ actions: [], summary: 'No memories to maintain.' });
      }

      const memoryListText = memories.map((m: any) =>
        `[ID: ${m.id}] [Category: ${m.category}] [Imp: ${m.importance}] [Conf: ${m.confidence}] "${m.content}"`
      ).join('\n');

      const prompt = `You are Elara's Memory Maintenance & Consolidation Engine.
Review her entire long-term notebook to identify:
1. DUPLICATE memories that can be MERGED.
2. CONTRADICTORY or OBSOLETE notes that should be UPDATED or DELETED.
3. UNCERTAIN entries that have been clarified.

EXISTING MEMORY NOTEBOOK:
${memoryListText}

Return a JSON payload listing proposed actions to clean and consolidate her notebook:
{
  "summary": "brief description of maintenance performed",
  "actions": [
    {
      "type": "UPDATE" | "MERGE" | "DELETE" | "NO_ACTION",
      "targetId": "mem_id_here",
      "mergeTargetIds": ["mem_1", "mem_2"],
      "memory": {
        "content": "consolidated prose note",
        "confidence": "certain" | "likely" | "uncertain",
        "importance": "low" | "normal" | "important" | "core",
        "isPrivate": boolean,
        "category": "User" | "Elara" | "Relationship" | "Home" | "Work" | "Projects" | "Preferences" | "People" | "Places" | "Experiences" | "Observations" | "Plans" | "Other",
        "tags": ["tag1"]
      },
      "reason": "explanation"
    }
  ]
}`;

      const ai = getGeminiClient();
      const candidateModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.7-flash'];

      for (const modelToTry of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelToTry,
            contents: prompt,
            config: {
              temperature: 0.1,
              maxOutputTokens: 1500,
              responseMimeType: 'application/json',
              safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
              ],
            },
          });

          const parsed = JSON.parse(response.text || '{"actions":[],"summary":"No changes"}');
          return res.json(parsed);
        } catch (subErr) {
          continue;
        }
      }

      res.json({ actions: [], summary: 'No changes' });
    } catch (e: any) {
      console.warn('Memory maintenance handled error:', e);
      res.json({ actions: [], summary: 'Maintenance error', error: e?.message });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
