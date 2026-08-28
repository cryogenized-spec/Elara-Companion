# Google Hub — Pass 13 Completion

## Objective

Make Google capability and permission state truthful and consistent across the authorization layer, user-facing Hub, and agent context. This pass is complete only when base capability state, action-level access, and authorization state agree for every relevant combination.

## Acceptance matrix

### Authorization states
- [x] Unauthorized Google identity is represented as unavailable to provider-backed capability actions.
- [x] Authorized identity with missing base capability access is represented as needs-access.
- [x] Authorized identity with base access plus missing optional action permissions is represented as limited.
- [x] Fully granted capability/action requirements are represented as enabled.
- [x] Authorization projector distinguishes authorized, partially-authorized, unauthorized, including valid identity with no optional capability scopes.

### Action-level truth
- [x] Every declared action resolves against its explicit `actionRequirements` when present.
- [x] Actions without provider permission requirements (Open/Ask/Enable) remain usable as control actions.
- [x] Multi-permission actions require all declared capabilities, never merely one.
- [x] Missing base permissions are reported separately from missing optional action permissions.

### UI truth
- [x] Google Hub Services state uses the same semantic states: Ready, Limited, Needs access, and unavailable when disconnected.
- [x] Capability panels continue to receive explicit per-action permission gates.
- [x] Permissions surface exposes the capability's base requirements and action-level requirements.
- [x] Account status remains independent from individual service/action availability.

### Agent truth
- [x] Agent context consumes the canonical `projectGoogleHubCapabilityStates` projector rather than reimplementing availability logic.
- [x] Agent context reports the same enabled/blocked action labels as the canonical projector.
- [x] Agent context exposes no access token or credential material.

## Implementation

- Added `src/services/googleHubCapabilityState.ts` as the pure canonical state projector.
- Updated `src/services/googleHubContextService.ts` to consume the canonical projector.
- Added `src/services/googleHubCapabilityState.test.ts` covering unauthorized, needs-access, limited, enabled, and action-requirement cases.
- Expanded `src/services/googleHubContextService.test.ts` to prove unavailable, limited, and fully enabled agent state and preserve the credential-free boundary.
- Expanded `src/services/googleHubAuthorizationService.test.ts` to explicitly prove a valid Google identity with no capability grants is partial rather than unknown.

## Verification

Source-level acceptance review completed against the Pass 13 specification. The existing `GoogleHub.tsx` uses equivalent all-required-permission predicates for service/action availability, while the agent path now consumes the canonical projector directly.

GitHub currently reports no workflow runs/statuses for the final branch head, and the current environment cannot perform dependency-backed TypeScript/lint/test/build execution. Those execution checks remain `NOT EXECUTED`, not `PASS`.

## Definition of done

All source-level Pass 13 acceptance items above are implemented and covered by executable tests. Dependency-backed execution remains an explicit integration-gate requirement and must be verified separately rather than inferred from source review.
