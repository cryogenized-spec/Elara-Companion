# Google Hub — Pass 13 Completion

## Objective

Make Google capability and permission state truthful and consistent across the authorization layer, user-facing Hub, and agent context. This pass is complete only when base capability state, action-level access, and authorization state agree for every relevant combination.

## Acceptance matrix

### Authorization states
- [x] Unauthorized Google identity is represented as unavailable to provider-backed capability actions.
- [x] Authorized identity with missing base capability access is represented as needs-access.
- [x] Authorized identity with base access plus missing optional action permissions is represented as limited.
- [x] Fully granted capability/action requirements are represented as enabled.
- [x] Authorization projector continues to distinguish authorized, partially-authorized, and unauthorized identity state.

### Action-level truth
- [x] Every declared action resolves against its explicit `actionRequirements` when present.
- [x] Actions without provider permission requirements (Open/Ask/Enable) remain usable as control actions.
- [x] Multi-permission actions require all declared capabilities, never merely one.
- [x] Missing base permissions are reported separately from missing optional action permissions.

### UI truth
- [x] Google Hub Services state uses the same authorization semantics: Ready, Limited, Needs access, or unavailable when disconnected.
- [x] Capability panels continue to receive explicit per-action permission gates.
- [x] Permissions surface exposes the capability's base requirements and action-level requirements.
- [x] Account status remains independent from individual service/action availability.

### Agent truth
- [x] Agent context now consumes the canonical `projectGoogleHubCapabilityStates` projector rather than recomputing availability independently.
- [x] Agent context reports the same enabled/blocked action labels as the canonical projector.
- [x] Agent context exposes no access token or credential material.

## Implementation

- Added `src/services/googleHubCapabilityState.ts` as the pure canonical state projector.
- Updated `src/services/googleHubContextService.ts` to consume the canonical projector.
- Added `src/services/googleHubCapabilityState.test.ts` covering unauthorized, needs-access, limited, and enabled states plus action requirements.
- Expanded `src/services/googleHubContextService.test.ts` to prove unavailable, limited, and fully enabled agent state and preserve the credential-free boundary.

## Verification

Source-level verification completed against the Pass 13 acceptance matrix. Existing `GoogleHub.tsx` uses equivalent all-required-permission semantics for service status and action availability, while the agent path now consumes the canonical projector directly.

The repository has not produced a successful dependency-backed TypeScript/lint/test/build execution in this environment. GitHub currently has no workflow runs/statuses for the final branch head. Those execution checks remain `NOT EXECUTED`, not `PASS`.

## Definition of done

Pass 13 is source-complete when every acceptance item above remains true. Automated TypeScript/lint/test/build execution is still a separate execution requirement for the eventual integration gate; it must not be inferred from source review.
