export {
  ELARA_SAFETY_SETTINGS,
  buildRuntimeConfig,
} from '../../src/runtime/geminiRuntimeConfigService';

export {
  buildConversationContents,
  MAX_AGENT_ITERATIONS,
  type ChatHistoryMessage,
} from '../../src/runtime/chatRuntimePrimitives';

export { runResilientGeminiStreamTurn } from '../../src/lib/resilientGeminiStream';

/**
 * Server-side Chat runtime boundary. Routes depend on this adapter rather than
 * importing legacy runtime modules directly. The remaining resilience helper
 * is intentionally isolated here until its implementation is physically moved
 * into the runtime layer.
 */
