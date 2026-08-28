# Stage 2 — Google Hub Pass 3: Unified Authorization State

Status: COMPLETE
Date: 2026-08-28
Branch: `feature/google-hub-pass3`

## Purpose

Pass 3 establishes the single, token-free authorization projection consumed by the Google Hub. Provider credentials remain inside the existing Google authorization implementation; the Hub receives only identity/capability state.

## Completed work

### 1. UI-safe authorization contract

`src/contracts/googleHubAuthorization.ts` defines:

- `GoogleHubAuthorizationStatus`
- `GoogleHubAuthorizationSnapshot`
- `GoogleHubAuthorizationStateContract`

The snapshot contains authorization status, the canonical granted/missing capability sets, and a timestamp. It deliberately does not contain an access token, credential, client secret, or other bearer material.

### 2. Capability-derived projection

`src/services/googleHubAuthorizationService.ts` derives its required permission set directly from the registered `GoogleHubCapabilityDescriptor[]` collection.

Shared capability requirements are deduplicated. A capability is considered satisfied only when its complete declared permission group is granted. This keeps authorization semantics aligned with the registry rather than with individual UI components.

The projection covers:

- fully authorized capability coverage
- partial authorization coverage
- identity unauthorized state
- shared/duplicate capability requirements
- token-free snapshots

### 3. Canonical provider adapter

`src/services/googleHubAuthorizationProvider.ts` is the provider seam between the existing Google authorization implementation and the Hub projection.

It delegates to the existing canonical `googleIdentity` / `googleCapabilities` services. No new token store or OAuth implementation was introduced.

This is the intended boundary:

`Google OAuth implementation → canonical provider adapter → token-free Hub authorization state → UI`

### 4. Existing Hub shell state bug identified and corrected in branch work

The Google Hub capability-state calculation had to use **all required capabilities**, not `some`. A capability requiring multiple permission groups must not be shown as enabled merely because one group is present.

The corrected logic requires every declared capability requirement to be granted.

### 5. Tests

`src/services/googleHubAuthorizationService.test.ts` covers full, partial, unauthorized, deduplicated and token-free states.

`src/services/googleHubAuthorizationProvider.test.ts` adds an explicit token-free capability projection test around the provider seam.

## Architecture guarantees

Pass 3 preserves these rules:

1. One Google identity/connection remains authoritative.
2. Service permissions remain incremental capabilities.
3. The capability registry remains the source of Hub requirements.
4. OAuth tokens are never exposed through Hub authorization state.
5. The UI does not need to know provider credential details.
6. Provider-specific authorization remains replaceable behind the adapter.

## Verification

The branch was reviewed against the existing Google authorization implementation, capability policy, Pass 2 registry, contracts and tests.

The repository's full local test/lint command could not be executed in this environment because the execution environment could not resolve GitHub/network dependencies. No successful local test run is claimed here.

## Next pass

**Pass 4 — Google Hub shell.**

The next implementation should consume the Pass 2 capability registry and this Pass 3 authorization projection. It should not reimplement OAuth state, scope policy, or provider logic.
