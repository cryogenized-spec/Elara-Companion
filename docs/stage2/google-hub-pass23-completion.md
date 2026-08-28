# Pass 23 — Deterministic Fallback Rules

## Objective

Separate fallback conditions from model preference. Fallback is rule-based and deterministic: retry the current model according to retry policy, then descend through the configured preference order only when the classified failure is explicitly eligible for failover.

## Delivered

- Canonical provider failure classification continues through `src/lib/apiError.ts`.
- `ReliabilitySettings.failoverErrorCodes` is the explicit persisted allow-list for fallback conditions.
- Unknown/unclassified provider errors are no longer forcibly added to the failover allow-list; fallback on `UNKNOWN_API_ERROR` requires explicit configuration.
- Retry policy remains separate from failover policy.
- Runtime routing now accepts the canonical `preferredModelOrder` as `preferenceOrder`.
- The preferred order is not rewritten when fallback occurs.
- Fallback descends in deterministic preference order.
- Skipping a cooling-down intermediate tier is controlled explicitly by `skipUnhealthyFallbackModels` rather than being an implicit preference mutation.
- Cooldown state remains separate from preference state.
- Preferred-model recovery remains controlled by `autoRestorePreferredModel`.
- Existing Gemini 3.5 compatibility remains supported.

## Failure taxonomy

`apiError.ts` classifies:

- HTTP 429 / rate limit
- daily quota 429
- 408 timeout
- 500 server error
- 502 gateway error
- 503 service unavailable / overloaded
- 504 gateway timeout
- network failure
- 404 model unavailable
- 401 authentication
- 403 permission
- 400 invalid request/context limit/content safety
- cancellation/client runtime
- unknown/unclassified provider failure

## Routing semantics

1. Use preference #1.
2. Retry according to retry policy if the classified error is retryable.
3. After retries are exhausted, consult `failoverErrorCodes`.
4. If the error is not enabled for fallback, stop and surface the error.
5. If enabled, move to the next preferred model tier.
6. Preserve the original preference order.
7. A later tier may be selected when an intermediate tier is unavailable/cooling down and `skipUnhealthyFallbackModels` explicitly permits skipping it.
8. Successful model execution clears that model's health failure record.
9. A cooled-down preferred model becomes primary again when `autoRestorePreferredModel` permits it.

## Default fallback policy

Enabled by default:

- rate limit / 429
- daily quota 429
- model unavailable / 404
- 500 server error
- 502 gateway error
- 503 service unavailable / overloaded
- 504 gateway timeout

Not enabled by default:

- authentication failure
- permission failure
- invalid request
- context limit
- safety refusal
- cancellation
- unknown/unclassified error

Unknown fallback can be enabled explicitly by storing `UNKNOWN_API_ERROR` in `failoverErrorCodes`.

## Verification

Pass 23 acceptance coverage lives in `src/lib/modelResiliencePass23.test.ts` and the updated compatibility coverage in `src/lib/modelResiliencePass3.test.ts`.

The tests prove the classification matrix, explicit unknown-error policy, deterministic preference-order fallback, retry/fallback separation, explicit unhealthy-tier skipping, partial-output veto, and cooldown/recovery behaviour.

Repository CI must provide execution-level verification before merge.
