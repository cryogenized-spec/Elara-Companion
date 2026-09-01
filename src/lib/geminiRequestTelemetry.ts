import type { GoogleGenAI } from '@google/genai';

export interface GeminiRequestUsageTelemetry {
  inputTokenCount?: number;
  outputTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
  toolUsePromptTokenCount?: number;
  cachedContentTokenCount?: number;
}

export interface GeminiRequestTokenMeasurement {
  countedInputTokens?: number;
  countError?: string;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Count the actual input shape that will be submitted to Gemini. The provider's
 * countTokens endpoint accepts system instructions and tools, so unlike local
 * character heuristics this includes the major non-history contributors to the
 * prompt budget.
 *
 * This is deliberately best-effort: observability must never prevent a normal
 * generation request when the count endpoint is unavailable or rejects a config
 * field unsupported by the installed SDK/provider combination.
 */
export async function countGeminiRequestTokens(
  ai: GoogleGenAI,
  model: string,
  contents: any[],
  generationConfig: any,
): Promise<GeminiRequestTokenMeasurement> {
  try {
    const config: any = {};
    if (generationConfig?.systemInstruction !== undefined) {
      config.systemInstruction = generationConfig.systemInstruction;
    }
    if (generationConfig?.tools !== undefined) {
      config.tools = generationConfig.tools;
    }

    const counted = await ai.models.countTokens({
      model,
      contents,
      ...(Object.keys(config).length > 0 ? { config } : {}),
    } as any);

    const countedInputTokens = readNumber((counted as any)?.totalTokens)
      ?? readNumber((counted as any)?.total_tokens);
    return { countedInputTokens };
  } catch (error: any) {
    return {
      countError: String(error?.message || error || 'Token counting failed').replace(/\s+/g, ' ').slice(0, 240),
    };
  }
}

export function extractGeminiUsageMetadata(response: any): GeminiRequestUsageTelemetry | undefined {
  const usage = response?.usageMetadata || response?.usage_metadata;
  if (!usage) return undefined;

  const telemetry: GeminiRequestUsageTelemetry = {
    inputTokenCount: readNumber(usage.promptTokenCount) ?? readNumber(usage.prompt_token_count),
    outputTokenCount: readNumber(usage.candidatesTokenCount) ?? readNumber(usage.candidates_token_count),
    totalTokenCount: readNumber(usage.totalTokenCount) ?? readNumber(usage.total_token_count),
    thoughtsTokenCount: readNumber(usage.thoughtsTokenCount) ?? readNumber(usage.thoughts_token_count),
    toolUsePromptTokenCount: readNumber(usage.toolUsePromptTokenCount) ?? readNumber(usage.tool_use_prompt_token_count),
    cachedContentTokenCount: readNumber(usage.cachedContentTokenCount) ?? readNumber(usage.cached_content_token_count),
  };

  return Object.values(telemetry).some((value) => value !== undefined) ? telemetry : undefined;
}
