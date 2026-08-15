import express from "express";
import { getGeminiClient, formatApiErrorDetails, normalizeModelName, parseDataUrl, HarmCategory, HarmBlockThreshold } from "../services/gemini";

export function setupChatRoutes(app: express.Express) {

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

}
