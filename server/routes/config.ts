import express from "express";
import { normalizeModelName, getGeminiClient } from "../services/gemini";
import { serverLockbox } from "../services/lockbox";

export function setupConfigRoutes(app: express.Express) {

  app.get('/api/config', (req, res) => {
    res.json({
      defaultModel: normalizeModelName(serverLockbox.config('GEMINI_MODEL', 'gemini-3.7-flash')),
      hasApiKey: Boolean(serverLockbox.optionalSecret('GEMINI_API_KEY')),
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

        if (lower.includes('2.5')) continue;

        const bannedKeywords = [
          'image', 'veo', 'live', 'tts', 'audio', 'imagen', 'embed',
          'lyria', 'banana', 'aqa', 'robotics', 'antigravity',
          'deep-research', 'computer-use'
        ];
        if (bannedKeywords.some((keyword) => lower.includes(keyword))) continue;

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
      for (const seed of seedModels) mergedMap.set(seed.id, seed);
      for (const dyn of dynamicModels) if (!mergedMap.has(dyn.id)) mergedMap.set(dyn.id, dyn);

      res.json({ models: Array.from(mergedMap.values()) });
    } catch (err) {
      console.warn('Error querying Gemini models list, returning seed list:', err);
      res.json({ models: seedModels });
    }
  });

}
