export {
  ELARA_SAFETY_SETTINGS,
  buildRuntimeConfig,
  buildConversationContents,
  MAX_AGENT_ITERATIONS,
} from '../../src/lib/chatRuntime';

export { runResilientGeminiStreamTurn } from '../../src/lib/resilientGeminiStream';

/**
 * Server-side adapter boundary for Chat runtime implementation details.
 * Routes must depend on this boundary rather than importing provider/runtime
 * implementation modules directly. The imported modules remain transitional
 * until the physical runtime extraction is completed.
 */
