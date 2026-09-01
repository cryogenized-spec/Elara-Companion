export {
  ELARA_SAFETY_SETTINGS,
  buildRuntimeConfig,
} from '../../src/runtime/geminiRuntimeConfigService';

export {
  buildConversationContents,
  MAX_AGENT_ITERATIONS,
  type ChatHistoryMessage,
} from '../../src/runtime/chatRuntimePrimitives';

export { runResilientGeminiInteractionTurn } from '../../src/lib/geminiInteractionsRuntime';

/**
 * Server-side Chat runtime boundary. Routes depend on this adapter rather than
 * importing provider-specific implementations directly. Interactions is the
 * sole model/tool transport exposed to the production Chat route.
 */
