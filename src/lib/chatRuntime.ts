/**
 * Compatibility façade for older consumers. New application/runtime code
 * must import primitives and configuration from the canonical runtime modules.
 */
export {
  ELARA_SAFETY_SETTINGS,
  type RuntimeConfigOptions,
  deriveThinkingLevel,
  normalizeModel,
  buildRuntimeConfig,
  parseRuntimeDataUrl,
} from '../runtime/geminiRuntimeConfigService';

export {
  MAX_AGENT_ITERATIONS,
  type ChatHistoryMessage,
  buildConversationContents,
} from '../runtime/chatRuntimePrimitives';

export type { Workspace } from '../types';
