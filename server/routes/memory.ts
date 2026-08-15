import express from "express";
import { getGeminiClient, formatApiErrorDetails, HarmCategory, HarmBlockThreshold } from "../services/gemini";

export function setupMemoryRoutes(app: express.Express) {

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

}
