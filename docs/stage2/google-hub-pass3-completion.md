# Stage 2 — Google Hub Pass 3: Unified Authorization State

Status: COMPLETE
Date: 2026-08-28
Branch: `feature/google-hub-pass3`

## Purpose

Pass 3 establishes the single, token-free authorization projection consumed by the Google Hub. Provider credentials remain inside the existing Google authorization implementation; the Hub receives only identity/capability state.

## Completed work

### 1. UI-safe authorization contract

`src/contracts/googleHubAuthorization.ts` defines `GoogleHubAuthorizationStatus`, `GoogleHubAuthorizationSnapshot`, and `GoogleHubAuthorizationStateContract`.

The snapshot contains authorization status, canonical granted/missing capability sets, and a timestamp. It deliberately contains no access token or credential material.

### 2. Capability-derived projection

`src/services/googleHubAuthorizationService.ts` derives its required permission set directly from the Google Hub capability descriptors. Shared requirements are deduplicated, and a capability is satisfied only when every declared permission requirement is granted.

Covered states include full authorization, partial authorization, identity unauthorized state, shared requirements, and token-free snapshots.

### 3. Canonical provider adapter

`src/services/googleHubAuthorizationProvider.ts` bridges the existing canonical `googleIdentity` / `googleCapabilities` services into the Hub authorization projection. No second OAuth implementation or token store was introduced.

The intended boundary is:

`Google OAuth implementation → canonical provider adapter → token-free Hub authorization state → UI`

### 4. Pass 3/Pass 4 boundary audit

The staged Google Hub shell in the current workstream contains a service-state calculation that must require **all** declared capability requirements. This was identified during Pass 3 review and is intentionally left as Pass 4 UI/composition work rather than smuggled into the authorization service.

### 5. Tests

`src/services/googleHubAuthorizationService.test.ts` covers full, partial, unauthorized, deduplicated and token-free states.

`src/services/googleHubAuthorizationProvider.test.ts` adds an explicit token-free projection test around the provider seam.

## Architecture guarantees

1. One Google identity/connection remains authoritative.
2. Service permissions remain incremental capabilities.
3. Hub requirements come from the capability registry.
4. OAuth tokens never enter Hub authorization state.
5. Provider credential details remain outside the UI contract.
6. Provider-specific authorization is replaceable behind the adapter.

## Verification

The branch was reviewed against the existing Google authorization implementation, capability policy, Pass 2 registry, contracts and tests.

The repository's full local test/lint command could not be executed in this environment because the execution environment could not resolve GitHub/network dependencies. No successful local test run is claimed.

## Next pass

**Pass 4 — Google Hub shell.**

Consume this authorization projection and the Pass 2 registry. Do not access Google OAuth state directly from the Hub UI, and do not duplicate scope policy in components.
