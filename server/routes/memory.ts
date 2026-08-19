import express from "express";
import { getGeminiClient, formatApiErrorDetails, HarmCategory, HarmBlockThreshold } from "../services/gemini";
import { TEXT_PROCESSING_POLICY } from "../../src/constants/textProcessingPolicy";

export function setupMemoryRoutes(app: express.Express) {

  app.post('/api/memory/analyze', async (req, res) => {
    try {
      const { userMessage, assistantResponse, currentMemories = [], userName = 'User' } = req.body;

      if (!userMessage && !assistantResponse) {
        return res.json({ actions: [] });
      }

      const existingMemoriesSummary = Array.isArray(currentMemories) && currentMemories.length > 0
        ? currentMemories.slice(0, 30).map((m: any) => `[ID: ${m.id}] [Kind: ${m.kind || 'context'}] [Lifecycle: ${m.lifecycle || 'persistent'}] [Category: ${m.category}] [Confidence: ${m.confidence}] [Importance: ${m.importance}] "${m.content}"`).join('\n')
        : 'No existing memories recorded yet.';

      const prompt = `${TEXT_PROCESSING_POLICY}

You are Elara's Autonomous Memory Extraction Engine.
Analyze this recent interaction between ${userName} and Elara to determine whether anything genuinely worth carrying forward should enter her persistent notebook.

RECENT INTERACTION:
User (${userName}): "${userMessage || ''}"
Elara: "${assistantResponse || ''}"

EXISTING MEMORIES:
${existingMemoriesSummary}

INSTRUCTIONS & RULES:
1. SELECTIVE: Ignore greetings, filler, one-off logistics, and information that has no likely future value.
2. NATURAL NOTE STYLE: Write a compact but meaningful natural-language note. Preserve context. A good note can say what was learned and why it matters, rather than merely labelling a fact. Example: "I've noticed that Gareth prefers a working result early in a project, even when he recognises that refinement still needs to follow." Do not invent motives or emotions.
3. VOICE: The note should sound like an observation Elara herself would sensibly keep in her notebook, while remaining factual and not pretending certainty where there is none.
4. EVIDENCE: Distinguish direct statements from observations. Use "certain" only for explicit evidence, "likely" for a well-supported inference, and "uncertain" sparingly.
5. PROJECTS: Shared technical work belongs in project memory, not as a personal fact about the user.
6. EPISODES: A meaningful event or completed milestone may be stored as an episode and should retain its date when known.
7. LINKING: When a memory is clearly about a conversation or artifact, populate the corresponding source/link fields when available.
8. CONTRADICTIONS: If a newer statement updates or invalidates an existing memory, prefer UPDATE, MERGE, or DELETE rather than creating a duplicate.
9. NO_ACTION: When evidence is weak or the information is transient, return NO_ACTION.

OUTPUT JSON:
{
  "actions": [
    {
      "type": "CREATE" | "UPDATE" | "MERGE" | "DELETE" | "NO_ACTION",
      "targetId": "mem_id_here (if UPDATE or DELETE)",
      "mergeTargetIds": ["mem_1", "mem_2"] (if MERGE),
      "memory": {
        "content": "natural-language notebook note",
        "kind": "fact" | "preference" | "observation" | "episode" | "project" | "relationship" | "plan" | "working" | "context",
        "lifecycle": "working" | "contextual" | "persistent" | "core" | "archived",
        "source": "user" | "elara" | "conversation" | "artifact" | "system" | "imported",
        "confidence": "certain" | "likely" | "uncertain",
        "importance": "low" | "normal" | "important" | "core",
        "isPrivate": boolean,
        "category": "User" | "Elara" | "Relationship" | "Home" | "Work" | "Projects" | "Preferences" | "People" | "Places" | "Experiences" | "Observations" | "Plans" | "Other",
        "eventDate": "YYYY-MM-DD (optional)",
        "expiresAt": "ISO timestamp (optional; use for genuinely temporary knowledge only)",
        "sourceArtifactId": "artifact id when applicable",
        "relatedMemoryIds": ["mem_id"],
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
              maxOutputTokens: 1200,
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

  app.post('/api/memory/maintain', async (req, res) => {
    try {
      const { memories = [], userName = 'User' } = req.body;

      if (!Array.isArray(memories) || memories.length === 0) {
        return res.json({ actions: [], summary: 'No memories to maintain.' });
      }

      const memoryListText = memories.map((m: any) =>
        `[ID: ${m.id}] [Kind: ${m.kind || 'context'}] [Lifecycle: ${m.lifecycle || 'persistent'}] [Category: ${m.category}] [Imp: ${m.importance}] [Conf: ${m.confidence}] "${m.content}"`
      ).join('\n');

      const prompt = `${TEXT_PROCESSING_POLICY}

You are Elara's Memory Maintenance & Consolidation Engine.
Review her long-term notebook to identify duplicate, stale, contradictory, or superseded memories. Preserve the most useful meaning and rewrite merged notes in natural language.

EXISTING MEMORY NOTEBOOK:
${memoryListText}

USER: ${userName}

Return JSON:
{
  "summary": "brief description of maintenance performed",
  "actions": [
    {
      "type": "UPDATE" | "MERGE" | "DELETE" | "NO_ACTION",
      "targetId": "mem_id_here",
      "mergeTargetIds": ["mem_1", "mem_2"],
      "memory": {
        "content": "consolidated natural-language note",
        "kind": "fact" | "preference" | "observation" | "episode" | "project" | "relationship" | "plan" | "working" | "context",
        "lifecycle": "working" | "contextual" | "persistent" | "core" | "archived",
        "source": "user" | "elara" | "conversation" | "artifact" | "system" | "imported",
        "confidence": "certain" | "likely" | "uncertain",
        "importance": "low" | "normal" | "important" | "core",
        "category": "User" | "Elara" | "Relationship" | "Home" | "Work" | "Projects" | "Preferences" | "People" | "Places" | "Experiences" | "Observations" | "Plans" | "Other",
        "isPrivate": boolean,
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