# Google Hub — Penultimate Audit Remediation

Date: 2026-08-28
Branch: `feature/google-hub-pass10`

This note records the corrections made after the penultimate audit of the Stage 2 Google Hub work.

## Corrections made

1. Restored the canonical provider adapter at `src/services/googleHubAuthorizationProvider.ts` so Google OAuth/provider state is projected through the token-free Hub authorization contract.
2. Corrected authorization classification so an authorized Google identity with zero optional capability grants is `partially-authorized`, not `unknown`/"Not connected".
3. Added an actual application entry point, `src/components/google/GoogleHubModal.tsx`, which composes the registry, authorization adapter, activity recorder, and all nine capability panels.
4. Added a visible `Google Hub` action to `Sidebar.tsx` so the new Hub is reachable without deleting the legacy Settings surface prematurely.
5. Wired capability enablement through the canonical Google capability policy and existing authorization service; the Hub still never receives or stores tokens.
6. Converted the Keep capability panel from a local-reference-only implementation to the existing real Google Keep provider service, with refresh, create, delete, and Open Keep actions.
7. Added `src/services/googleHubComposition.test.ts` covering the registered capability set and identity-only authorization semantics.

## Invariants

- A capability is enabled only when every declared required capability is granted.
- The Hub does not own OAuth, access tokens, raw provider HTTP, or duplicate scope definitions.
- Provider services remain the execution boundary.
- Activity history remains bounded and credential-free.
- The old monolithic Google Workspace settings surface remains present only as a migration/deprecation concern; the new Hub is now actually reachable in the application.

## Verification status

The repository contains TypeScript tests and the normal lint/typecheck scripts. A successful local dependency install/test run cannot be claimed in this environment because outbound GitHub/DNS access is unavailable. The final branch should therefore receive a real CI run before production merge.
