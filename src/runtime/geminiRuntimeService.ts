import type { Workspace } from '../types';
import {
  runDirectGeminiStream,
  type DirectStreamParams,
} from '../lib/geminiDirectClient';

/**
 * Application-facing Gemini execution boundary.
 *
 * Higher layers should depend on this runtime service rather than importing
 * the Gemini provider/client implementation directly. The underlying client
 * remains in its transitional location until the later runtime extraction
 * passes complete the physical move.
 */
export type GeminiStreamChunk = Parameters<DirectStreamParams['onChunk']>[0];
export type GeminiStreamRequest = Omit<DirectStreamParams, 'onChunk'> & {
  onChunk: (chunk: GeminiStreamChunk) => void;
};

export async function streamGemini(request: GeminiStreamRequest): Promise<void> {
  return runDirectGeminiStream(request);
}

/**
 * Stable runtime hook for callers that need an explicit workspace context.
 * This keeps the runtime-facing contract free of provider-specific naming.
 */
export function normalizeGeminiWorkspace(workspace?: Workspace): Workspace | undefined {
  return workspace;
}
