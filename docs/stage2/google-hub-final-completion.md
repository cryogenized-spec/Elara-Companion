# Google Hub — Final UX Completion

Branch: `feature/google-hub-completion`

This branch completes the four gaps identified by the post-Pass-10 audit.

## Completed

### 1. Full original UX surface
- Gmail exposes practical search filters: from, to, after, before, unread, attachment.
- Calendar exposes Today, Tomorrow, Next 7 days, upcoming refresh, lightweight event creation, and direct Calendar access.
- Drive exposes search, inspection, upload, and direct Drive access.
- Tasks exposes list/refresh, creation, completion, and direct Google Tasks access.
- Docs, Sheets, Keep, Contacts, and Chat remain modular and provider-backed.

### 2. Google Hub as the user-facing Google system
- Google Hub is the dedicated sidebar entry point.
- The old standalone `GoogleCapabilitySettingsPanel` is absent from the completion branch.
- The historical Google-heavy Settings implementation has been moved to `LegacySettingsModal.tsx` and is no longer exposed as the Settings workspace tab.
- `SettingsModal.tsx` is now a compatibility shell that preserves unrelated Settings while suppressing the retired Google Workspace tab.
- Google account/services/activity/permissions presentation now lives in the dedicated Hub.

### 3. Rich AI/context bridge
- `googleHubContextService.ts` builds a credential-free structured Google context envelope.
- Context includes account identity, authorization state, granted/missing capabilities, action-level availability, and recent activity.
- Hub-level and service-level Ask Elara actions inject that context into the normal `elara:ask` chat route.
- Consequential actions remain subject to the existing confirmation policy.

### 4. Fine-grained capability status
- Capability descriptors declare per-action requirements.
- Service cards distinguish Ready, Limited, and Needs access.
- Permissions expose action-level access and explain what/why/data.
- Enabling a service requests the union of its declared base and action requirements.

## Architectural invariant

`Google OAuth/provider -> canonical authorization provider -> token-free authorization snapshot -> Google Hub -> registered capability modules -> Google provider services`

The Hub never receives or stores an access token.

## Verification

Source-level repository review completed. GitHub currently reports no workflow runs/statuses for the final branch head, and the current execution environment cannot install repository dependencies from GitHub. Therefore no successful local or CI TypeScript/lint/build execution is claimed.
