import express from "express";
import { getGeminiClient } from "../services/gemini";
import { ELARA_SAFETY_SETTINGS } from "../../src/lib/chatRuntime";

type MemoryExtractionAction = {
  type?: string;
  targetId?: string;
  memory?: Record<string, unknown>;
  reason?: string;
};

const VALID_KINDS = new Set(['fact', 'preference', 'observation', 'episode', 'project', 'relationship', 'plan', 'working', 'context']);
const VALID_CATEGORIES = new Set(['User', 'Elara', 'Relationship', 'Home', 'Work', 'Projects', 'Preferences', 'People', 'Places', 'Experiences', 'Observations', 'Plans', 'Other']);
const VALID_CONFIDENCE = new Set(['certain', 'likely', 'uncertain']);
const VALID_IMPORTANCE = new Set(['low', 'normal']);

export function sanitizeObservationActions(value: unknown): { actions: MemoryExtractionAction[] } {
  const actions = Array.isArray((value as any)?.actions) ? (value as any).actions : [];
  const sanitized = actions.flatMap((action: MemoryExtractionAction) => {
    if (!action || typeof action !== 'object') return [];
    if (action.type === 'NO_ACTION') return [{ type: 'NO_ACTION' }];
    if (action.type !== 'CREATE' && action.type !== 'ADD' && action.type !== 'UPDATE') return [];
    if (action.type === 'UPDATE' && typeof action.targetId !== 'string') return [];
    if (!action.memory || typeof action.memory !== 'object' || typeof action.memory.content !== 'string' || !action.memory.content.trim()) return [];

    const memory = action.memory;
    return [{
      type: action.type === 'ADD' ? 'CREATE' : action.type,
      ...(action.targetId ? { targetId: action.targetId } : {}),
      memory: {
        content: String(memory.content).trim(),
        kind: VALID_KINDS.has(String(memory.kind)) ? memory.kind : 'observation',
        lifecycle: memory.lifecycle === 'working' ? 'working' : 'contextual',
        source: 'conversation',
        category: VALID_CATEGORIES.has(String(memory.category)) ? memory.category : 'Observations',
        confidence: VALID_CONFIDENCE.has(String(memory.confidence)) ? memory.confidence : 'likely',
        importance: VALID_IMPORTANCE.has(String(memory.importance)) ? memory.importance : 'normal',
        isPrivate: true,
        tags: Array.isArray(memory.tags) ? memory.tags.filter((tag) => typeof tag === 'string') : [],
        eventDate: typeof memory.eventDate === 'string' ? memory.eventDate : undefined,
        expiresAt: typeof memory.expiresAt === 'string' ? memory.expiresAt : undefined,
        sourceArtifactId: typeof memory.sourceArtifactId === 'string' ? memory.sourceArtifactId : undefined,
        relatedMemoryIds: Array.isArray(memory.relatedMemoryIds) ? memory.relatedMemoryIds.filter((id) => typeof id === 'string') : [],
        resolution: 'observation',
        state: 'active',
      },
      reason: typeof action.reason === 'string' ? action.reason : 'Grounded observation from the recent interaction.',
    }];
  });
  return { actions: sanitized };
}

export function setupMemoryRoutes(app: express.Express) {
  app.post('/api/memory/analyze', async (req, res) => {
    try {
      const { userMessage, assistantResponse, currentMemories = [], userName = 'User' } = req.body;
      if (!userMessage && !assistantResponse) return res.json({ actions: [] });

      const existingMemoriesSummary = Array.isArray(currentMemories) && currentMemories.length > 0
        ? currentMemories.slice(0, 40).map((m: any) => `[ID: ${m.id}] [Resolution: ${m.resolution || 'contextual'}] [Kind: ${m.kind || 'context'}] [Lifecycle: ${m.lifecycle || 'persistent'}] [Category: ${m.category}] [State: ${m.state || 'active'}] [Confidence: ${m.confidence}] [Importance: ${m.importance}] "${m.content}"`).join('\n')
        : 'No existing memories recorded yet.';

      const prompt = `You are Elara's Autonomous Memory Extraction Engine.

The task is to preserve a quiet stream of small, useful, grounded observations from the recent interaction. Do NOT decide what becomes permanent memory. Later consolidation, promotion, contradiction handling, maintenance, and retrieval are separate system layers.

RECENT INTERACTION:
User (${userName}): "${userMessage || ''}"
Elara: "${assistantResponse || ''}"

CURRENT NOTEBOOK:
${existingMemoriesSummary}

RULES:
- Record useful details about circumstances, activities, projects, plans, preferences, routines, interests, relationships, purchases, places, worries, decisions, or one-off events when they may reasonably matter later.
- Do not invent facts. Do not infer sensitive traits from weak evidence. Do not record credentials, secrets, passwords, API keys, financial credentials, or authentication material.
- Do not turn a fleeting emotional statement into a stable personality trait.
- Prefer NO_ACTION when there is genuinely nothing useful to preserve.
- New records MUST be resolution=observation and state=active. They MUST use lifecycle=contextual or lifecycle=working, and importance=low or importance=normal.
- Only CREATE or UPDATE observations. Do NOT DELETE, MERGE, or directly promote anything.
- Write concise, natural-language observations.

Return ONLY valid JSON using this schema:
{"actions":[{"type":"CREATE"|"UPDATE"|"NO_ACTION","targetId":"existing ID when updating","memory":{"content":"observation","kind":"fact|preference|observation|episode|project|relationship|plan|working|context","lifecycle":"working|contextual","source":"conversation","category":"User|Elara|Relationship|Home|Work|Projects|Preferences|People|Places|Experiences|Observations|Plans|Other","importance":"low|normal","confidence":"certain|likely|uncertain","isPrivate":true,"tags":["string"],"eventDate":"optional YYYY-MM-DD","expiresAt":"optional ISO timestamp","sourceArtifactId":"optional artifact id","relatedMemoryIds":["optional ids"]},"reason":"brief reason"}]}`;

      const ai = getGeminiClient();
      const candidateModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.7-flash'];
      for (const modelToTry of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelToTry,
            contents: prompt,
            config: {
              temperature: 0.15,
              maxOutputTokens: 1000,
              responseMimeType: 'application/json',
              safetySettings: ELARA_SAFETY_SETTINGS,
            },
          });
          const parsed = JSON.parse(response.text || '{"actions":[]}');
          return res.json(sanitizeObservationActions(parsed));
        } catch {
          continue;
        }
      }
      return res.json({ actions: [] });
    } catch (error: any) {
      console.warn('Memory analysis handled error:', error);
      return res.json({ actions: [] });
    }
  });
}
