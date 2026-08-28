import express from 'express';
import { getGeminiClient, normalizeModelName } from '../services/gemini';
import { serverLockbox } from '../services/lockbox';
import { ELARA_SAFETY_SETTINGS } from '../services/chatModelRuntime';

const MAX_EVENTS = 500;
const MAX_EVENT_BYTES = 160000;
const GOOGLE_STATUS_URL = 'https://status.cloud.google.com/summary';

function sanitizeSnapshot(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') return {};
  const snapshot = input as Record<string, unknown>;
  const events = Array.isArray(snapshot.events) ? snapshot.events.slice(-MAX_EVENTS) : [];
  return {
    capturedAt: snapshot.capturedAt,
    range: snapshot.range,
    events: events.map((event) => {
      if (!event || typeof event !== 'object') return null;
      const e = event as Record<string, unknown>;
      return {
        id: e.id,
        timestamp: e.timestamp,
        timezone: e.timezone,
        kind: e.kind,
        outcome: e.outcome,
        provider: e.provider,
        sessionId: e.sessionId,
        conversationId: e.conversationId,
        requestId: e.requestId,
        preferredModel: e.preferredModel,
        actualModel: e.actualModel,
        preferenceRank: e.preferenceRank,
        attempt: e.attempt,
        errorCode: e.errorCode,
        httpStatus: e.httpStatus,
        retryAfterMs: e.retryAfterMs,
        retryDelayMs: e.retryDelayMs,
        retrying: e.retrying,
        fallbackEligible: e.fallbackEligible,
        fallbackAllowed: e.fallbackAllowed,
        fallbackTaken: e.fallbackTaken,
        fallbackTarget: e.fallbackTarget,
        cooldownApplied: e.cooldownApplied,
        cooldownUntil: e.cooldownUntil,
        latencyMs: e.latencyMs,
        message: typeof e.message === 'string' ? e.message.replace(/(?:api[_ -]?key|access[_ -]?token|oauth[_ -]?token|authorization|cookie|secret|password)\s*[=:]\s*[^\s,;]+/gi, '$1=[redacted]').slice(0, 240) : undefined,
      };
    }).filter(Boolean),
    modelHealth: snapshot.modelHealth,
    fallbackFrequency: snapshot.fallbackFrequency,
    failureClassifications: snapshot.failureClassifications,
    latencyMs: snapshot.latencyMs,
    preferenceOrder: snapshot.preferenceOrder,
    fallbackRules: snapshot.fallbackRules,
  };
}

async function fetchExternalEvidence(): Promise<{ source: string; title: string; checkedAt: number; summary: string; url: string }[]> {
  try {
    const response = await fetch(GOOGLE_STATUS_URL, { headers: { 'User-Agent': 'Elara-Companion diagnostics' } });
    const html = await response.text();
    const summary = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);
    return [{
      source: 'Google Cloud Service Health',
      title: 'Google Cloud Service Health',
      checkedAt: Date.now(),
      summary,
      url: GOOGLE_STATUS_URL,
    }];
  } catch {
    return [];
  }
}

export function setupDiagnosticsRoutes(app: express.Express): void {
  app.post('/api/diagnostics/analyze', async (req, res) => {
    try {
      const snapshot = sanitizeSnapshot(req.body?.snapshot);
      const externalEvidence = req.body?.checkOnline ? await fetchExternalEvidence() : [];
      const model = typeof req.body?.model === 'string' && req.body.model.trim()
        ? normalizeModelName(req.body.model.trim())
        : serverLockbox.config('GEMINI_MODEL', 'gemini-3.7-flash')!;
      const serialized = JSON.stringify({ snapshot, externalEvidence });
      if (serialized.length > MAX_EVENT_BYTES) return res.status(413).json({ error: 'Diagnostic snapshot is too large to analyse.' });

      const ai = getGeminiClient();
      const prompt = [
        'Analyse this Elara model-routing diagnostic snapshot.',
        'Use exactly these sections in the report: OBSERVED, INFERRED, EXTERNAL EVIDENCE, RECOMMENDATION.',
        'OBSERVED may contain only facts directly supported by the local snapshot.',
        'INFERRED must identify uncertainty and must not present correlation as causation.',
        'EXTERNAL EVIDENCE may use only the supplied external evidence and must never be presented as local telemetry.',
        'RECOMMENDATION may suggest changes but must not claim that any change has been applied.',
        'If the sample is too small, explicitly say the evidence is insufficient.',
        'Never invent provider incidents, timing patterns, failures, or explanations.',
        'Return strict JSON with keys observed, inferred, externalEvidence, recommendations, uncertainty.',
        '',
        serialized,
      ].join('\n');

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 1800,
          responseMimeType: 'application/json',
          safetySettings: ELARA_SAFETY_SETTINGS,
        },
      });

      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(response.text || '{}'); } catch { parsed = {}; }
      const list = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 20) : [];
      return res.json({
        modelUsed: model,
        report: {
          observed: list(parsed.observed),
          inferred: list(parsed.inferred),
          externalEvidence: list(parsed.externalEvidence),
          recommendations: list(parsed.recommendations),
          uncertainty: list(parsed.uncertainty),
        },
        externalEvidence,
      });
    } catch (error) {
      console.error('Diagnostics analysis failed:', error);
      return res.status(500).json({ error: 'Diagnostics analysis failed.' });
    }
  });
}
