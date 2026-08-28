# Google Hub Stage 2 — Passes 1–10

Status: COMPLETE
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
- Pass 8 — Keep/Reference, Contacts and Google Chat capability panels.
- Pass 9 — durable local Google activity history and permission projection completion.
- Pass 10 — final proving test and all-required-capability UI invariant.

## Architecture that must not be regressed

`Google OAuth/provider implementation -> provider adapter -> token-free authorization projection -> Google Hub -> injected capability panels`

The Hub must not own OAuth, access tokens, provider HTTP calls, or duplicated scope policy.

A capability is enabled only when **all** of its declared required capability permissions are granted.

Future Google services should be added as independent registry definitions and panel modules rather than by expanding `SettingsModal.tsx` or `GoogleHub.tsx` into a provider-specific switchboard.

## Current implementation notes

The existing project still contains the historical monolithic Google Workspace settings surface in `SettingsModal.tsx`. The Stage 2 work deliberately establishes the replacement architecture before deleting that legacy surface; that cleanup belongs in the integration/migration workstream and must not result in two competing Google Hub implementations.

## Verification limitation

The GitHub connector reports no CI status for the final feature commit and the local execution environment cannot resolve `github.com` for dependency installation. Source-level tests and architectural checks are present, but no successful local `npm test`/`npm run lint` run is claimed.
