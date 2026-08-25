import { incrementRateLimit } from '../lib/storage';

/**
 * Application boundary for Chat request accounting.
 * Chat does not know how rate-limit counters are persisted.
 */
export function recordChatRequest(modelId: string): void {
  incrementRateLimit(modelId);
}
