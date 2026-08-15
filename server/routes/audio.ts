import express from "express";
import { HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getGeminiClient } from "../services/gemini";
import { parseDataUrl, sanitizeAudioMime } from "../utils/helpers";

export function setupAudioRoutes(app: express.Express) {

  app.post('/api/audio/transcribe', async (req, res) => {
    try {
      const { audioData, mimeType = 'audio/webm', language } = req.body;
      if (!audioData) {
        return res.json({ text: '', error: 'Missing audioData payload' });
      }

      let cleanBase64 = String(audioData);
      let detectedMime = sanitizeAudioMime(mimeType);
      const parsed = parseDataUrl(audioData);
      if (parsed) {
        cleanBase64 = parsed.data;
        detectedMime = sanitizeAudioMime(parsed.mimeType || mimeType);
      }

      // Remove any leftover whitespace or data url prefix
      cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');

      if (cleanBase64.length < 50) {
        return res.json({ text: '', model: 'none' });
      }

      const prompt = `You are a high-precision speech-to-text transcription engine.
Transcribe all spoken words from this audio recording verbatim.
Formatting rules:
1. Apply standard punctuation (periods, commas, question marks).
2. Capitalize the beginning of sentences and proper nouns.
3. If the audio is silent, background noise, or unintelligible, return an empty string.
4. Output ONLY the raw transcribed text without quotes, speaker labels, or markdown code blocks.${
        language ? `\n5. Target language: ${language}` : ''
      }`;

      const ai = getGeminiClient();
      const targetModel = 'gemini-3.7-flash'; // High-speed, multimodal, flagship model for transcription

      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: detectedMime,
                    data: cleanBase64,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          config: {
            temperature: 0.1,
            maxOutputTokens: 1500,
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
          },
        });

        let transcript = response.text?.trim() || '';
        if (transcript.startsWith('```') && transcript.endsWith('```')) {
          transcript = transcript.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
        }
        if (transcript === '[EMPTY]' || transcript.toLowerCase() === 'empty') {
          transcript = '';
        }
        return res.json({ text: transcript, model: targetModel });
      } catch (err: any) {
        console.warn(`Transcription attempt with ${targetModel} notice (${err?.status || err?.message}):`, err?.message || err);
        return res.json({ text: '', warning: 'Transcription unavailable for this audio segment.' });
      }
    } catch (err: any) {
      console.error('Error in /api/audio/transcribe:', err);
      res.json({ text: '', error: err?.message || 'Speech transcription failed' });
    }
  });

  // ----------------------------------------------------
  // Google Chat & Webhook Integration Endpoints
  // ----------------------------------------------------
  interface ServerSpaceWebhook {
    id: string;
    spaceId: string;
    name: string;
    webhookUrl: string;
    autoDailySummary: boolean;
    autoTaskAlerts: boolean;
    createdAt: string;
    lastTriggered?: string;
  }

  const registeredSpaceWebhooks: ServerSpaceWebhook[] = [];

}
