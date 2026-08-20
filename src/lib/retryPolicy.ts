import { ClassifiedApiError, classifyApiError } from './apiError';

export interface RetryPolicy {
  /** Maximum total execution attempts, including the first attempt. */
  maxAttempts: number;
  /** Base delay used for exponential backoff when the server gives no Retry-After hint. */
  baseDelayMs: number;
  /** Upper bound for any individual backoff delay. */
  maxDelayMs: number;
  /** Proportion of jitter applied around the calculated delay. 0 disables jitter. */
  jitterRatio: number;
  /** Whether a server-provided Retry-After hint should take precedence over local backoff. */
  honorRetryAfter: boolean;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterRatio: 0.2,
  honorRetryAfter: true,
};

export interface RetryContext {
  attempt: number;
  nextAttempt: number;
  delayMs: number;
  error: ClassifiedApiError;
}

export interface RetryOptions {
  policy?: Partial<RetryPolicy>;
  modelId?: string;
  signal?: AbortSignal;
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
  random?: () => number;
  onRetry?: (context: RetryContext) => void | Promise<void>;
}

export interface RetryResult<T> {
  value: T;
  attempts: number;
}

const defaultSleep = (delayMs: number, signal?: AbortSignal): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason || new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(resolve, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason || new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });

function mergePolicy(policy?: Partial<RetryPolicy>): RetryPolicy {
  const merged = { ...DEFAULT_RETRY_POLICY, ...policy };
  return {
    ...merged,
    maxAttempts: Math.max(1, Math.floor(merged.maxAttempts)),
    baseDelayMs: Math.max(0, merged.baseDelayMs),
    maxDelayMs: Math.max(0, merged.maxDelayMs),
    jitterRatio: Math.min(1, Math.max(0, merged.jitterRatio)),
  };
}

export function calculateRetryDelay(
  attempt: number,
  error: ClassifiedApiError,
  policy: RetryPolicy,
  random: () => number = Math.random,
): number {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const serverHint = error.retryAfterMs;
  const base = policy.honorRetryAfter && serverHint !== undefined
    ? Math.min(policy.maxDelayMs, Math.max(0, serverHint))
    : exponential;

  if (policy.jitterRatio === 0 || base === 0) return Math.round(base);

  const jitter = (random() * 2 - 1) * policy.jitterRatio;
  return Math.max(0, Math.min(policy.maxDelayMs, Math.round(base * (1 + jitter))));
}

export async function runWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const policy = mergePolicy(options.policy);
  const sleep = options.sleep || defaultSleep;
  const random = options.random || Math.random;
  let lastError: ClassifiedApiError | undefined;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    if (options.signal?.aborted) {
      throw options.signal.reason || new DOMException('Aborted', 'AbortError');
    }

    try {
      const value = await operation(attempt);
      return { value, attempts: attempt };
    } catch (error) {
      const classified = classifyApiError(error, options.modelId);
      lastError = classified;

      const hasNextAttempt = attempt < policy.maxAttempts;
      if (!classified.retryable || !hasNextAttempt) {
        throw Object.assign(new Error(classified.message), { apiError: classified });
      }

      const delayMs = calculateRetryDelay(attempt, classified, policy, random);
      const context: RetryContext = {
        attempt,
        nextAttempt: attempt + 1,
        delayMs,
        error: classified,
      };

      await options.onRetry?.(context);
      await sleep(delayMs, options.signal);
    }
  }

  throw Object.assign(new Error(lastError?.message || 'Retry attempts exhausted.'), {
    apiError: lastError,
  });
}
