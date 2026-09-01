export {
  ELARA_SAFETY_SETTINGS,
  buildRuntimeConfig,
} from '../../src/runtime/geminiRuntimeConfigService';

export {
  buildConversationContents,
  MAX_AGENT_ITERATIONS,
  type ChatHistoryMessage,
} from '../../src/runtime/chatRuntimePrimitives';

export {
  runResilientGeminiInteractionTurn,
  runResilientGeminiInteractionTurn as runResilientGeminiStreamTurn,
} from '../../src/lib/geminiInteractionsRuntime';

/**
 * Server-side Chat runtime boundary. Routes depend on this adapter rather than
 * importing provider-specific implementations directly. Interactions is the
 * sole model/tool transport exposed to the production Chat route.
 *
 * The StreamTurn alias is temporary migration compatibility for Pass 6 and is
 * scheduled for removal with the legacy GenerateContent module in Pass 7.
 */
