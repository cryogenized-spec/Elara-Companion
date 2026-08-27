import express from "express";
import { getGeminiClient } from "../services/gemini";
import { parseDataUrl, sanitizeAudioMime } from "../utils/helpers";
import { ELARA_SAFETY_SETTINGS } from "../services/chatModelRuntime";

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

      cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');

      if (cleanBase64.length < 50) {
        return res.json({ text: '', model: 'none' });
      }

      const prompt = `You are a high-precision speech-to-text transcription engine.\nTranscribe all spoken words from this audio recording verbatim.\nFormatting rules:\n1. Apply standard punctuation (periods, commas, question marks).\n2. Capitalize the beginning of sentences and proper nouns.\n3. If the audio is silent, background noise, or unintelligible, return an empty string.\n4. Output ONLY the raw transcribed text without quotes, speaker labels, or markdown code blocks.${
        language ? `\n5. Target language: ${language}` : ''
      }`;

      const ai = getGeminiClient();
      const targetModel = 'gemini-3.7-flash';

      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: detectedMime, data: cleanBase64 } },
                { text: prompt },
              ],
            },
          ],
          config: {
            temperature: 0.1,
            maxOutputTokens: 1500,
            safetySettings: ELARA_SAFETY_SETTINGS,
          },
        });

        let transcript = response.text?.trim() || '';
        if (transcript.startsWith('```') && transcript.endsWith('```')) {
          transcript = transcript.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
        }
        if (transcript === '[EMPTY]' || transcript.toLowerCase() === 'empty') transcript = '';
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
}
