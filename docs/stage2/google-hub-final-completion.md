# Google Hub — Final UX Completion

This branch completes the four gaps identified by the post-Pass-10 audit.

## Completed

### 1. Full original UX surface
- Gmail now exposes practical search filters: from, to, after, before, unread, attachment.
- Calendar now exposes Today, Tomorrow, Next 7 days, upcoming refresh, lightweight event creation, and direct Calendar access.
- Drive now exposes search, inspection, upload, and direct Drive access.
- Tasks now exposes list/refresh, creation, completion, and direct Google Tasks access.
- Existing Docs, Sheets, Keep, Contacts, and Chat panels remain modular and provider-backed.

### 2. Google Hub as the user-facing Google system
- Google Hub is the dedicated sidebar entry point.
- The old standalone Google capability settings panel has been removed.
- The Hub owns account, services, activity, and permissions presentation.
- Legacy Google UI code remains inside the historical SettingsModal implementation for now as dormant code; it is not the canonical Google entry point. Further physical source deletion should be handled only after confirming unrelated Settings workspace behaviour is preserved.

### 3. Rich AI/context bridge
- Added `googleHubContextService.ts` to build a credential-free structured Google context envelope.
- The envelope includes account identity, authorization state, granted/missing capability state, action-level availability, and recent activity.
- Hub-level and service-level Ask Elara actions now inject that structured context into the normal chat route through the existing `elara:ask` event bridge.
- Consequential writes remain subject to the existing Google tool confirmation policy.

### 4. Fine-grained capability status
- Capability descriptors now declare optional per-action requirements.
- Service cards distinguish `Ready`, `Limited`, and `Needs access`.
- Permissions show action-level availability instead of treating the whole service as one permission switch.
- Enabling a capability requests the union of its base and action-specific requirements.

## Architectural invariant

`Google OAuth/provider -> canonical authorization provider -> token-free authorization snapshot -> Google Hub -> registered capability modules -> Google provider services`

The Hub never receives or stores an access token.

## Verification

Repository source review completed. GitHub Actions reports no workflow run for the final branch head, and the current execution environment cannot install repository dependencies from GitHub. Therefore no local or CI TypeScript/lint/build pass is claimed here.
