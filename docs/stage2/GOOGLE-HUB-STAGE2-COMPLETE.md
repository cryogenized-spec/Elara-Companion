# Google Hub Stage 2 — Passes 1–10

Status: COMPLETE — audit-remediated
Final branch: `feature/google-hub-pass10`

This document is the durable bookmark for future Elara sessions.

## Sequence

- Pass 1 — UX/domain audit: baseline and extraction map.
- Pass 2 — capability contract + registry.
- Pass 3 — unified, token-free authorization projection + provider adapter.
- Pass 4 — Google Hub shell: Account / Services / Activity / Permissions and panel injection seam.
- Pass 5 — Gmail capability: search, detail, drafts, explicit send gate.
- Pass 6 — Calendar + Tasks capability surfaces; task creation/completion provider operation.
- Pass 7 — Drive / Docs / Sheets capability surfaces.
- Pass 8 — Keep, Contacts and Google Chat capability panels.
- Pass 9 — durable local Google activity history and permission projection completion.
- Pass 10 — final proving test and all-required-capability UI invariant.
- Penultimate audit remediation — restored provider adapter, corrected identity-only authorization state, mounted the Hub, and converted Keep to the real Google Keep provider.

## Architecture that must not be regressed

`Google OAuth/provider implementation -> provider adapter -> token-free authorization projection -> Google Hub -> injected capability panels`

The Hub must not own OAuth, access tokens, provider HTTP calls, or duplicated scope policy.

A capability is enabled only when **all** of its declared required capability permissions are granted.

The application must expose the Hub through a real rendered entry point. Capability panels must be reachable through Hub composition; orphaned modules are not considered complete.

Future Google services should be added as independent registry definitions and panel modules rather than by expanding `SettingsModal.tsx` or `GoogleHub.tsx` into a provider-specific switchboard.

## Verification

Source-level tests cover registry behaviour, authorization states, credential-free projections, activity persistence, and final composition assumptions.

The repository's normal CI/lint/typecheck commands remain authoritative. No successful local `npm test`/`npm run lint` execution is claimed from this environment because outbound GitHub/DNS access is unavailable.

The legacy Google Workspace UI in `SettingsModal.tsx` remains as an explicit migration/deprecation concern; the new Hub is now separately reachable in the actual application so later migration can be performed without an orphaned replacement.
