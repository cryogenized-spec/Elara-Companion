# Pass 25 — Persistent Routing Log & Model Health History

## Objective

Create a structured, durable routing history that can later be analysed by Elara. This is routing telemetry, not a plain text log.

## Delivered

- Extended the canonical resilience event contract with timestamp, timezone, provider, session ID, optional conversation ID, request ID, preferred/actual model, preference rank, attempt, error classification, HTTP status, retry-after, retry delay, fallback eligibility/decision/taken state, fallback destination, cooldown state and latency/outcome metadata.
- Persisted routing history to browser durable storage under a versioned key with a hard 500-event retention bound.
- Added an injectable persistence adapter so reload/reconstruction and storage failure behaviour can be tested without coupling routing to browser storage.
- Added allow-list sanitization: only declared routing fields can survive into persisted records, and diagnostic messages redact credential-shaped material.
- Kept prompts, API keys, bearer tokens, OAuth tokens, cookies, authorization headers and arbitrary runtime fields out of the event schema/persistence boundary.
- Added session ID lifecycle support and per-request IDs so a complete routing attempt can be reconstructed chronologically.
- Added `resilienceModelHealth.ts`, deriving `healthy`, `degraded`, `cooling down`, and `unavailable` strictly from the routing event history rather than UI-owned health state.
- Existing Pass 24 diagnostics automatically consume the now-persistent event history, so Debug history survives reload without a second telemetry path.

## Retention

The durable routing history retains the newest 500 events. Older entries are evicted deterministically.

## Health semantics

- `healthy`: latest meaningful model state is successful/recovered.
- `cooling down`: the model has a persisted future cooldown deadline.
- `unavailable`: the latest model failure is model-not-found/unavailable.
- `degraded`: the history shows failures without an active cooldown and without a newer successful recovery state.

These are derived views over persisted events, not independently stored UI flags.

## Acceptance coverage

`src/lib/resilienceHistoryPass25.test.ts` covers:

- structured persistence and storage replacement/reload reconstruction;
- real `gemini-3.7-flash` 429 failure → fallback route → `gemini-3.6-flash` success trace with one request ID;
- timestamp/timezone/session/request metadata;
- credential-shaped message redaction and rejection of arbitrary secret fields;
- hard 500-event retention;
- derived healthy/cooling/degraded/unavailable model-health states.

## Verification requirement

The repository CI production verifier must execute the full test/build/lint/verification suite on the exact final Pass 25 head before merge.
