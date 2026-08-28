# Pass 26 — Diagnostics Analysis & Report Generation

## Status

COMPLETE — verified by repository CI on the final Pass 26 implementation head. Reports are generated on demand from structured persisted routing telemetry. No routing preference or fallback policy is modified by report generation.

## User-facing flow

Developer diagnostics exposes **Analyse**. The analysis dialog provides:

- Last hour
- Today
- Last 7 days
- Last 30 days
- Custom period
- Explicit **Check online** option

The online option is opt-in and adds public Google Cloud Service Health evidence separately from local telemetry.

## Analysis snapshot

The local snapshot contains the selected time range, machine-readable timezone and timestamps, filtered routing events, derived model health, fallback frequency, failure classifications, latency summaries, preference order, and the active retry/fallback policy configuration.

Credentials, tokens, cookies, authorization headers, complete prompts, and arbitrary runtime fields are not sent to the analysis prompt.

## Report contract

Generated reports are normalized into five distinct result areas:

1. **OBSERVED** — facts directly supported by local telemetry.
2. **INFERRED** — patterns or conclusions that must disclose uncertainty and cannot present correlation as causation.
3. **EXTERNAL EVIDENCE** — only explicitly requested external provider-status evidence.
4. **RECOMMENDATION** — proposed routing/policy changes; proposals do not apply automatically.
5. **UNCERTAINTY** — limitations or insufficient evidence.

The model is explicitly instructed not to invent incidents, timing patterns, or explanations and to say when the sample is too small.

## External evidence

The optional online check is limited to public Google Cloud Service Health information and remains visibly separate from local observations. Google documents that Service Health provides current service status and incident history. See: https://status.cloud.google.com/

## Persistence boundary

Pass 26 does not introduce a second report archive. The generated report is a transient analysis result. Dedicated model-stamped report storage belongs to Pass 27.

## Acceptance coverage

`src/lib/resilienceAnalysisPass26.test.ts` covers period resolution, event-window filtering, policy capture, required report-section separation, uncertainty rules in the analysis prompt, and removal of raw diagnostic message text from the analysis payload.

The existing Pass 24/25 suites remain the source of truth for diagnostic event production, persistence and model-health derivation.

## Verification evidence

The preceding exact implementation head `63977ca0f60c47758a1dc5fba8fdf1ca608ce37a` passed GitHub Actions run **#905**. The completion-record-only update on top of that verified tree requires a new exact-head CI gate before merge; this document will be considered fully sealed only after that next run is green.

## Explicit non-automatic behaviour

Analysis and recommendations never modify:

- preferred model order;
- fallback model order;
- retry counts;
- fallback error conditions;
- cooldown settings;
- recovery settings.

Any future adaptive routing feature requires a separate explicit user approval flow.
