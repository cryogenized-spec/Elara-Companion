import { ClassifiedApiError, classifyApiError } from './apiError';
import { DEFAULT_RETRY_POLICY, RetryPolicy, runWithRetry } from './retryPolicy';
import {
  DEFAULT_MODEL_COOLDOWN_MS,
  ModelHealthState,
  createModelHealthState,
  recordModelFailure,
  recordModelSuccess,
  selectRuntimeModel,
} from './modelHealth';

export const DEFAULT_FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
] as const;

export interface ModelResiliencePolicy {
  retryPolicy?: Partial<RetryPolicy>;
  fallbackModels?: string[];
  failoverEnabled?: boolean;
  cooldownMs?: number;
}

export interface ModelResilienceContext {
  model: string;
  usedFallback: boolean;
  probingPreferred: boolean;
  attempts: number;
}

export interface ModelTurn<T> {
  value: T;
  emittedOutput?: boolean;
}

export interface ModelResilienceStateStore {
  get(): ModelHealthState;
  set(state: ModelHealthState): void;
}

const defaultStateStore: ModelResilienceStateStore = {
  let state: ModelHealthState = createModelHealthState();
  get() {
    return state;
  },
  set(next) {
    state = next;
  },
};

function shouldFailOver(error: ClassifiedApiError): boolean {
  return [
    'API_RATE_LIMIT_RPM_429',
    'API_QUOTA_DAILY_429',
    'MODEL_NOT_FOUND_404',
    'SERVER_ERROR_500',
    'BAD_GATEWAY_502',
    'SERVICE_UNAVAILABLE_503',
    'GATEWAY_TIMEOUT_504',
  ].includes(error.code);
}

function getErrorFromThrown(error: unknown, modelId: string): ClassifiedApiError {
  const attached = (error as any)?.apiError;
  return attached || classifyApiError(error, modelId);
}

export async function runWithModelResilience<T>(
  preferredModel: string,
  executeTurn: (model: string, attempt: number) => Promise<ModelTurn<T>>,
  options: ModelResiliencePolicy = {},
  stateStore: ModelResilienceStateStore = defaultStateStore,
): Promise<{ value: T; context: ModelResilienceContext }> {
  const fallbackModels = options.fallbackModels || [...DEFAULT_FALLBACK_MODELS];
  const failoverEnabled = options.failoverEnabled !== false;
  const cooldownMs = options.cooldownMs ?? DEFAULT_MODEL_COOLDOWN_MS;
  let attemptedModels = new Set<string>();
  let state = stateStore.get();

  while (true) {
    const selection = selectRuntimeModel({
      preferredModel,
      fallbackModels,
      state,
      now: Date.now(),
    });

    const selectedModel = selection.model;
    const normalized = selectedModel.trim().toLowerCase();
    if (attemptedModels.has(normalized)) {
      throw new Error(`Model resilience exhausted its available model path after attempting [${selectedModel}].`);
    }
    attemptedModels.add(normalized);

    try {
      const result = await runWithRetry(
        async (attempt) => {
          try {
            const turn = await executeTurn(selectedModel, attempt);
            state = recordModelSuccess(state, selectedModel);
            stateStore.set(state);
            return turn;
          } catch (error) {
            const classified = getErrorFromThrown(error, selectedModel);
            if ((error as any)?.retryableOverride === false) {
              throw Object.assign(new Error(classified.message), {
                apiError: { ...classified, retryable: false },
              });
            }
            throw error;
          }
        },
        {
          policy: options.retryPolicy || DEFAULT_RETRY_POLICY,
          modelId: selectedModel,
        },
      );

      return {
        value: result.value.value,
        context: {
          model: selectedModel,
          usedFallback: selection.usedFallback,
          probingPreferred: selection.probingPreferred,
          attempts: result.attempts,
        },
      };
    } catch (error) {
      const classified = getErrorFromThrown(error, selectedModel);
      state = recordModelFailure(state, selectedModel, classified, Date.now(), cooldownMs);
      stateStore.set(state);

      if (!failoverEnabled || !shouldFailOver(classified)) {
        throw error;
      }

      const nextSelection = selectRuntimeModel({
        preferredModel,
        fallbackModels,
        state,
        now: Date.now(),
      });
      if (nextSelection.model.trim().toLowerCase() === normalized) {
        throw error;
      }
    }
  }
}

export function resetModelResilienceState(stateStore: ModelResilienceStateStore = defaultStateStore): void {
  stateStore.set(createModelHealthState());
}

export { defaultStateStore };
