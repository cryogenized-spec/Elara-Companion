# Pass 24 — Advanced Fallback Controls & Developer Diagnostics

## Objective

Expose deterministic routing rules without cluttering the normal chat interface. The normal model control remains simple; advanced fallback controls and developer diagnostics live in the Reliability & Failover configuration area.

## Delivered

- Added persisted `diagnosticLevel` with `off`, `basic`, `detailed`, and `debug` levels. Default is `off`.
- Added explicit user control for fallback on `UNKNOWN_API_ERROR`; disabled by default and never silently enabled.
- Kept retry attempts, preferred-model recovery, and provider `Retry-After` controls in the existing advanced reliability area.
- Added a single canonical structured resilience diagnostic event stream shared by the routing engine and diagnostics UI.
- Routing emits structured REQUEST, RETRY, ERROR, POLICY, ROUTE, RECOVERY, and SUCCESS events from the same `runWithModelResilience` path.
- Basic mode shows only the concise model transition and friendly failure reason.
- Detailed mode exposes selected model, actual model, preference rank, attempt, classification, HTTP status, retry delay, fallback decision, and cooldown state.
- Debug mode exposes the structured routing event stream directly in the application UI; no browser console inspection is required.
- Diagnostic rendering is opt-in and hidden completely when diagnostics are `off`.
- Diagnostic messages are sanitized for credential-shaped material and bounded in size; no API keys, bearer tokens, OAuth tokens, cookies, authorization headers, secret environment variables, or full request payloads are emitted.

## Security boundary

Only routing metadata is emitted. Model identifiers, classifications, HTTP status, timing, policy decisions, cooldown timestamps, and sanitized short messages are allowed. Raw provider errors or request payloads are not surfaced to diagnostics.

## Verification

Pass 24 coverage lives in `src/lib/resilienceDiagnosticsPass24.test.ts` and `src/lib/modelResiliencePass24.test.ts`, alongside the existing Pass 23 reliability suite. The tests cover the default-off diagnostic setting, all four levels, canonical-event provenance, structured fallback telemetry, and credential redaction.

Repository CI must pass on the final branch head before merge.
