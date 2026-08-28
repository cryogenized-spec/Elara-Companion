import { ClassifiedApiError, classifyApiError } from './apiError';
import { DEFAULT_RETRY_POLICY, RetryPolicy, runWithRetry } from './retryPolicy';
import type { ReliabilitySettings } from './reliabilitySettings';
import {
  DEFAULT_MODEL_COOLDOWN_MS,
  ModelHealthState,
  createModelHealthState,
  recordModelFailure,
  recordModelSuccess,
  selectRuntimeModel,
} from './modelHealth';
import { emitResilienceDiagnostic } from './resilienceDiagnostics';

export const DEFAULT_FALLBACK_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
] as const;

export interface ModelResiliencePolicy {
  retryPolicy?: Partial<RetryPolicy>;
  fallbackModels?: string[];
  preferenceOrder?: string[];
  failoverEnabled?: boolean;
  cooldownMs?: number;
  autoRestorePreferredModel?: boolean;
  retryableErrorCodes?: string[];
  failoverErrorCodes?: string[];
  skipUnhealthyFallbackModels?: boolean;
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

let defaultModelHealthState: ModelHealthState = createModelHealthState();

const defaultStateStore: ModelResilienceStateStore = {
  get() { return defaultModelHealthState; },
  set(next) { defaultModelHealthState = next; },
};

const DEFAULT_FAILOVER_CODES = new Set([
  'API_RATE_LIMIT_RPM_429',
  'API_QUOTA_DAILY_429',
  'MODEL_NOT_FOUND_404',
  'SERVER_ERROR_500',
  'BAD_GATEWAY_502',
  'SERVICE_UNAVAILABLE_503',
  'GATEWAY_TIMEOUT_504',
]);

export function isFailoverEligible(error: ClassifiedApiError, configuredCodes?: string[]): boolean {
  if ((error as any).failoverOverride === false) return false;
  if (configuredCodes) return new Set(configuredCodes).has(error.code);
  return DEFAULT_FAILOVER_CODES.has(error.code);
}

function getErrorFromThrown(error: unknown, modelId: string): ClassifiedApiError {
  const attached = (error as any)?.apiError;
  return attached || classifyApiError(error, modelId);
}

function preferenceRank(preferenceOrder: string[], model: string): number | undefined {
  const index = preferenceOrder.findIndex((id) => id === model.trim().toLowerCase());
  return index >= 0 ? index + 1 : undefined;
}

export function buildModelResiliencePolicy(settings?: ReliabilitySettings): ModelResiliencePolicy {
  if (!settings) {
    return {
      retryPolicy: DEFAULT_RETRY_POLICY,
      fallbackModels: [...DEFAULT_FALLBACK_MODELS],
      preferenceOrder: [...DEFAULT_FALLBACK_MODELS],
      failoverEnabled: true,
      cooldownMs: DEFAULT_MODEL_COOLDOWN_MS,
      autoRestorePreferredModel: true,
      skipUnhealthyFallbackModels: true,
    };
  }

  return {
    retryPolicy: {
      maxAttempts: settings.autoRetryEnabled ? settings.maxAttempts : 1,
      baseDelayMs: settings.baseDelayMs,
      maxDelayMs: settings.maxDelayMs,
      jitterRatio: settings.jitterRatio,
      honorRetryAfter: settings.honorRetryAfter,
    },
    fallbackModels: settings.fallbackModels,
    preferenceOrder: settings.preferredModelOrder,
    failoverEnabled: settings.autoFailoverEnabled,
    cooldownMs: settings.cooldownMs,
    autoRestorePreferredModel: settings.autoRestorePreferredModel,
    retryableErrorCodes: settings.retryableErrorCodes,
    failoverErrorCodes: settings.failoverErrorCodes,
    skipUnhealthyFallbackModels: true,
  };
}

export async function runWithModelResilience<T>(
  preferredModel: string,
  executeTurn: (model: string, attempt: number) => Promise<ModelTurn<T>>,
  options: ModelResiliencePolicy = {},
  stateStore: ModelResilienceStateStore = defaultStateStore,
): Promise<{ value: T; context: ModelResilienceContext }> {
  const preferenceOrder = [
    ...new Set((options.preferenceOrder || options.fallbackModels || [preferredModel]).map((id) => id.trim().toLowerCase()).filter(Boolean)),
  ];
  if (!preferenceOrder.includes(preferredModel.trim().toLowerCase())) preferenceOrder.unshift(preferredModel.trim().toLowerCase());

  const fallbackModels = preferenceOrder;
  const failoverEnabled = options.failoverEnabled !== false;
  const cooldownMs = options.cooldownMs ?? DEFAULT_MODEL_COOLDOWN_MS;
  const attemptedModels = new Set<string>();
  let state = stateStore.get();
  const retryableCodes = options.retryableErrorCodes ? new Set(options.retryableErrorCodes) : undefined;

  while (true) {
    const skipUnhealthy = options.skipUnhealthyFallbackModels !== false;
    const selection = selectRuntimeModel({
      preferredModel,
      fallbackModels,
      state,
      now: Date.now(),
      autoRestorePreferredModel: options.autoRestorePreferredModel,
      skipUnhealthyFallbackModels: skipUnhealthy,
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
          emitResilienceDiagnostic({
            kind: 'REQUEST',
            preferredModel,
            actualModel: selectedModel,
            preferenceRank: preferenceRank(preferenceOrder, selectedModel),
            attempt,
          });

          try {
            const turn = await executeTurn(selectedModel, attempt);
            state = recordModelSuccess(state, selectedModel);
            stateStore.set(state);
            emitResilienceDiagnostic({
              kind: selection.probingPreferred ? 'RECOVERY' : 'SUCCESS',
              preferredModel,
              actualModel: selectedModel,
              preferenceRank: preferenceRank(preferenceOrder, selectedModel),
              attempt,
              message: selection.probingPreferred ? 'Preferred model recovered.' : 'Model execution succeeded.',
            });
            return turn;
          } catch (error) {
            const classified = getErrorFromThrown(error, selectedModel);
            if (retryableCodes && !retryableCodes.has(classified.code)) {
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
          onRetry: ({ attempt, nextAttempt, delayMs, error }) => {
            emitResilienceDiagnostic({
              kind: 'RETRY',
              preferredModel,
              actualModel: selectedModel,
              preferenceRank: preferenceRank(preferenceOrder, selectedModel),
              attempt,
              errorCode: error.code,
              httpStatus: error.httpStatus,
              retryDelayMs: delayMs,
              retrying: true,
              message: `Retrying ${selectedModel}.`,
            });
            emitResilienceDiagnostic({
              kind: 'POLICY',
              preferredModel,
              actualModel: selectedModel,
              preferenceRank: preferenceRank(preferenceOrder, selectedModel),
              attempt: nextAttempt,
              errorCode: error.code,
              fallbackAllowed: false,
              message: 'Retry permitted by retry policy.',
            });
          },
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
      const cooldownUntil = Date.now() + cooldownMs;
      state = recordModelFailure(state, selectedModel, classified, Date.now(), cooldownMs);
      stateStore.set(state);

      const fallbackAllowed = failoverEnabled && isFailoverEligible(classified, options.failoverErrorCodes);
      emitResilienceDiagnostic({
        kind: 'ERROR',
        preferredModel,
        actualModel: selectedModel,
        preferenceRank: preferenceRank(preferenceOrder, selectedModel),
        errorCode: classified.code,
        httpStatus: classified.httpStatus,
        fallbackAllowed,
        cooldownUntil,
        message: classified.message,
      });
      emitResilienceDiagnostic({
        kind: 'POLICY',
        preferredModel,
        actualModel: selectedModel,
        preferenceRank: preferenceRank(preferenceOrder, selectedModel),
        errorCode: classified.code,
        httpStatus: classified.httpStatus,
        fallbackAllowed,
        cooldownUntil,
        message: fallbackAllowed ? 'Fallback allowed by configured failure conditions.' : 'Fallback not allowed by configured failure conditions.',
      });

      if (!fallbackAllowed) throw error;

      const nextSelection = selectRuntimeModel({
        preferredModel,
        fallbackModels,
        state,
        now: Date.now(),
        autoRestorePreferredModel: options.autoRestorePreferredModel,
        skipUnhealthyFallbackModels: skipUnhealthy,
      });
      if (nextSelection.model.trim().toLowerCase() === normalized) throw error;

      emitResilienceDiagnostic({
        kind: 'ROUTE',
        preferredModel,
        actualModel: selectedModel,
        preferenceRank: preferenceRank(preferenceOrder, selectedModel),
        errorCode: classified.code,
        httpStatus: classified.httpStatus,
        fallbackAllowed: true,
        fallbackTarget: nextSelection.model,
        cooldownUntil,
        message: `${selectedModel} → ${nextSelection.model}`,
      });
    }
  }
}

export function resetModelResilienceState(stateStore: ModelResilienceStateStore = defaultStateStore): void {
  stateStore.set(createModelHealthState());
}

export { defaultStateStore };
