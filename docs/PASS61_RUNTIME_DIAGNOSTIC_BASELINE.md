# Pass 61 — Runtime Diagnostic Baseline

## Objective

Establish a stable diagnostic request identity for a single Gemini chat execution without introducing a parallel tracing system.

## Implementation

`src/lib/resilientGeminiStream.ts` now owns a weak association between each live Gemini `contents` array and a generated `request-*` identifier. The association is reused for repeated resilient turns that share that `contents` array, which is how the direct and backend Chat loops represent successive tool rounds.

The resilient turn boundary also accepts optional `conversationId` and `requestId` values and forwards them into the existing `ModelResiliencePolicy`. Existing resilience diagnostics therefore retain their current event schema and storage/overlay while gaining stable request correlation when the caller supplies an ID or when the shared contents array is used.

No provider payloads, tool-call semantics, fallback policy, or error classification were changed in this pass.

## Why the identity is attached to `contents`

The current Chat execution loops mutate one `contents` array across tool rounds. Using that array as the lifecycle anchor gives Pass 1 a stable request identity without adding a second global request registry or requiring every caller to duplicate ID-generation logic.

A new Chat execution constructs a new `contents` array and therefore receives a new request ID. Retries inside the same resilient turn already share the same resilience request ID, and successive tool turns now share it as well.

## Verification added

`src/lib/__tests__/resilientGeminiStream.requestIdentity.test.ts` verifies that two resilient turns over the same `contents` array emit the same diagnostic request ID.

## Explicitly deferred

Payload/token measurement, tool-history integrity probes, raw-provider error capture, report UI, and any behavioral correction remain deferred to later passes.

The legacy/reference repository remains untouched; all changes are in `cryogenized-spec/Elara-Companion-current`.
