import { GoogleGenAI } from '@google/genai';
import { MemoryItem, MemoryCategory, MemoryImportance, MemoryConfidence } from '../types';

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
  onChunk: (chunk: { text?: string; thoughtText?: string; finishReason?: string; safetyRatings?: any }) => void;
  signal?: AbortSignal;
}

export async function runDirectGeminiStream(params: DirectStreamParams): Promise<void> {
  const {
    apiKey,
    model,
    systemPrompt,
    history = [],
    message,
    image,
    temperature,
    maxOutputTokens,
    topP,
    topK,
    thinkingBudget,
    onChunk,
    signal,
  } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('Please enter your Gemini API Key in Settings (Model & API tab) to chat on GitHub Pages.');
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  // Build contents array
  const contents: any[] = [];

  for (const h of history) {
    const parts: any[] = [];
    if (h.image) {
      const match = h.image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }
    if (h.content) {
      parts.push({ text: h.content });
    }
    if (parts.length > 0) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }
  }

  // Current turn message & image
  const currentParts: any[] = [];
  if (image) {
    const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (match) {
      currentParts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }
  if (message) {
    currentParts.push({ text: message });
  }

  if (currentParts.length > 0) {
    contents.push({
      role: 'user',
      parts: currentParts,
    });
  }

  // System instructions
  let fullSystemInstruction = systemPrompt || '';

  const cleanModel = model.replace(/^models\//, '').trim() || 'gemini-3.7-flash';

  const config: any = {};
  if (fullSystemInstruction.trim()) {
    config.systemInstruction = fullSystemInstruction;
  }
  if (typeof temperature === 'number') config.temperature = temperature;
  if (typeof maxOutputTokens === 'number') config.maxOutputTokens = maxOutputTokens;
  if (typeof topP === 'number') config.topP = topP;
  if (typeof topK === 'number') config.topK = topK;

  if (typeof thinkingBudget === 'number' && thinkingBudget >= 0) {
    config.thinkingConfig = {
      thinkingBudget: thinkingBudget,
    };
  }

  if (signal?.aborted) {
    throw new Error('Aborted before starting');
  }

  return new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      reject(signal?.reason || new DOMException('Aborted', 'AbortError'));
    };

    if (signal) {
      if (signal.aborted) {
        return handleAbort();
      }
      signal.addEventListener('abort', handleAbort);
    }

    (async () => {
      try {
        config.tools = [
          {
            functionDeclarations: [
              {
                name: 'generate_canvas',
                description: 'Use this tool to generate long-form content, detailed plans, blueprints, scripts, outlines, documentation, or creative writing in an interactive Canvas Workspace for the user.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    title: {
                      type: 'STRING',
                      description: 'A concise, descriptive title for the canvas.',
                    },
                    content: {
                      type: 'STRING',
                      description: 'The structured markdown or code content to be placed inside the canvas.',
                    },
                  },
                  required: ['title', 'content'],
                },
              },
            ],
          },
        ];

        const responseStream = await ai.models.generateContentStream({
          model: cleanModel,
          contents,
          config,
        });

        for await (const chunk of responseStream) {
          if (signal?.aborted) break;

          const candidate = chunk.candidates?.[0];
          const finishReason = candidate?.finishReason;
          const safetyRatings = candidate?.safetyRatings;

          const parts = candidate?.content?.parts;
          if (parts && parts.length > 0) {
            for (const part of parts) {
              if ((part as any).thought) {
                onChunk({ thoughtText: part.text });
              } else if ((part as any).functionCall) {
                const fc = (part as any).functionCall;
                if (fc.name === 'generate_canvas') {
                  const title = fc.args?.title || 'Canvas Workspace';
                  const content = fc.args?.content || '';
                  onChunk({ text: `\n<canvas title="${title}">\n${content}\n</canvas>\n`, finishReason, safetyRatings });
                }
              } else if (part.text) {
                onChunk({ text: part.text, finishReason, safetyRatings });
              }
            }
          } else if (chunk.text) {
            onChunk({ text: chunk.text, finishReason, safetyRatings });
          } else if (finishReason) {
            onChunk({ finishReason, safetyRatings });
          }
        }

        resolve();
      } catch (err) {
        reject(err);
      } finally {
        if (signal) {
          signal.removeEventListener('abort', handleAbort);
        }
      }
    })();
  });
}

export async function runDirectTitleGeneration(apiKey: string, firstUserMsg: string, firstAssistantMsg: string): Promise<string> {
  if (!apiKey || !apiKey.trim()) return 'New Conversation';
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const prompt = `Generate a very brief, elegant title (maximum 4-5 words) summarizing this conversation start. Do not use quotes or prefixes.
User: ${firstUserMsg.slice(0, 150)}
Assistant: ${firstAssistantMsg.slice(0, 150)}
Title:`;

    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 20,
        temperature: 0.7,
      },
    });

    const title = res.text?.trim().replace(/^["']|["']$/g, '');
    return title || 'New Conversation';
  } catch (e) {
    console.warn('Direct title generation error:', e);
    return 'New Conversation';
  }
}

export async function runDirectMemoryExtraction(
  apiKey: string,
  userMessage: string,
  assistantResponse: string,
  currentMemories: MemoryItem[],
  userName: string
): Promise<any[]> {
  if (!apiKey || !apiKey.trim()) return [];
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const formattedExisting = currentMemories && currentMemories.length > 0
      ? currentMemories.slice(0, 30).map((m: any) => `[ID: ${m.id}] [Category: ${m.category}] [Confidence: ${m.confidence}] "${m.content}"`).join('\n')
      : 'No existing memories recorded yet.';

    const prompt = `You are Elara's Autonomous Memory Extraction Engine.
Analyze this recent interaction between [[user]] (${userName}) and Elara to determine if any new note should be created, updated, merged, or deleted in her long-term notebook.

RECENT INTERACTION:
User: "${userMessage.slice(0, 1000)}"
Elara: "${assistantResponse.slice(0, 1500)}"

CURRENT NOTEBOOK MEMORIES:
${formattedExisting}

Return ONLY valid JSON matching this schema:
{
  "actions": [
    {
      "type": "CREATE" | "UPDATE" | "DELETE",
      "targetId": "string (required for UPDATE and DELETE)",
      "memory": {
        "content": "concise, fact-based memory note",
        "category": "User" | "Elara" | "Relationship" | "Home" | "Work" | "Projects" | "Preferences" | "People" | "Places" | "Experiences" | "Observations" | "Plans" | "Other",
        "importance": "core" | "important" | "normal" | "low",
        "confidence": "certain" | "likely" | "uncertain",
        "isPrivate": true | false,
        "tags": ["string"],
        "eventDate": "optional YYYY-MM-DD string"
      },
      "reason": "brief reason for this action"
    }
  ]
}`;

    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const text = res.text || '{}';
    const parsed = JSON.parse(text);
    return parsed?.actions || [];
  } catch (e) {
    console.warn('Direct memory extraction error:', e);
    return [];
  }
}

export async function runDirectMemoryMaintenance(
  apiKey: string,
  memories: MemoryItem[],
  userName: string
): Promise<{ actions: any[]; summary: string }> {
  if (!apiKey || !apiKey.trim()) return { actions: [], summary: 'No API key provided.' };
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const formattedList = memories.map((m) =>
      `[ID: ${m.id}] [Category: ${m.category}] [Importance: ${m.importance}] [Confidence: ${m.confidence}] "${m.content}"`
    ).join('\n');

    const prompt = `You are Elara's Long-Term Memory Notebook Auditor.
Review the following memories about [[user]] (${userName}) and Elara.
Identify any duplicate notes, superseded facts, or notes that should be merged.

MEMORIES LIST:
${formattedList}

Return ONLY valid JSON:
{
  "summary": "Brief 1-2 sentence explanation of maintenance performed",
  "actions": [
    {
      "type": "DELETE" | "UPDATE",
      "targetId": "ID of memory to delete or update",
      "memory": {
        "content": "updated concise text if updating",
        "importance": "core" | "important" | "normal" | "low",
        "confidence": "certain" | "likely" | "uncertain",
        "category": "User" | "Elara" | "Relationship" | "Home" | "Work" | "Projects" | "Preferences" | "People" | "Places" | "Experiences" | "Observations" | "Plans" | "Other"
      },
      "reason": "why this action is taken"
    }
  ]
}`;

    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(res.text || '{}');
    return {
      actions: parsed?.actions || [],
      summary: parsed?.summary || 'Memory notebook audit complete.',
    };
  } catch (e) {
    console.warn('Direct memory audit error:', e);
    return { actions: [], summary: 'Audit failed.' };
  }
}
