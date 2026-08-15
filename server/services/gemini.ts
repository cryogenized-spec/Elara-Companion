import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

export { HarmCategory, HarmBlockThreshold };

export function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;
  return {
    mimeType: matches[1],
    data: matches[2],
  };
}

export function getGeminiClient() {
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
  export function formatApiErrorDetails(err: any, modelId: string): { code?: number | string; status?: string; message: string; modelId: string } {
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

  // Helper to normalize Gemini model string and safely resolve aliases
  export function normalizeModelName(rawModel?: string): string {
    if (!rawModel || typeof rawModel !== 'string') {
      return 'gemini-3.7-flash';
    }
    let clean = rawModel.trim();
    // Remove wrapping quotes or backticks
    clean = clean.replace(/^["'`]|["'`]$/g, '').trim();
    // Strip leading 'models/' or '/models/' repeatedly
    clean = clean.replace(/^(\/?models\/)+/gi, '').trim();

    // Map common aliases and forward-looking names to current stable equivalents
    const aliasMap: Record<string, string> = {
      'gemini-3.1-pro': 'gemini-3.1-pro-preview',
      'gemini-3-flash': 'gemini-3-flash-preview',
      'gemini-pro-latest': 'gemini-3.1-pro-preview',
      'gemini-flash-latest': 'gemini-3.7-flash',
      'gemini-1.5-flash': 'gemini-3.7-flash', 
      'gemini-2.0-flash': 'gemini-3.7-flash',
      'gemini-2.5-flash': 'gemini-3.7-flash'
    };

    if (aliasMap[clean]) {
      return aliasMap[clean];
    }

    // Sanitize remaining characters
    clean = clean.replace(/[^a-zA-Z0-9\.\-_]/g, '');
    return clean || 'gemini-3.7-flash';
  }
