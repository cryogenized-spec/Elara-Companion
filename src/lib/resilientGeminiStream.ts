/**
 * Pass 7 compatibility shim.
 *
 * The legacy GenerateContent transport and its Gemini 3 history validator are
 * gone. Production transport lives exclusively in geminiInteractionsRuntime.
 * This filename remains temporarily so older application callers do not gain
 * a second provider path while the final caller extraction completes.
 */
export {
  runResilientGeminiInteractionTurn as runResilientGeminiStreamTurn,
} from './geminiInteractionsRuntime';

export type {
  InteractionRuntimeOptions as ResilientStreamTurnOptions,
  InteractionRuntimeResult as ResilientStreamTurnResult,
} from './geminiInteractionsRuntime';
