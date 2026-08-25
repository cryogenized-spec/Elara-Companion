# Pass 29 — Google / External State Boundary

## Objective

Separate Elara's local application state from Google remote state and establish one canonical local authorization-state model.

## Canonical state model

- **Local configuration:** Google client ID configuration (`VITE_GOOGLE_CLIENT_ID` or the user override stored under `elara_custom_google_client_id`).
- **Local authorization state:** `googleAuthorization.ts` owns the current access token, expiry timestamp, granted scopes, client ID, and authorization status.
- **Capability policy:** `googleCapabilityPolicy.ts` defines which Google capabilities map to which scopes. Capability grants are interpreted locally from the authorization response; they are not treated as remote resource data.
- **Remote truth:** Gmail, Calendar, Tasks, Drive, Docs, Sheets, Keep, Contacts and Google Chat remain authoritative for their own resources. Elara does not treat local copies of those resources as authoritative application state.
- **Application boundary:** `googleWorkspaceService.ts` is the application-facing Google identity/capability boundary.

## Completed

`googleAuthorization.ts` now exposes a single `GoogleAuthorizationState` snapshot and owns token expiry handling. An expired token is cleared from the local authorization state before it can be reported as connected or returned to callers. Custom client-ID configuration also belongs to this canonical identity module.

`googleWorkspaceService.googleIdentity` now exposes the canonical authorization state and configuration operations. `getGoogleAgentAccessToken()` reads the canonical token rather than the legacy Google API client's private token store.

This creates a stable distinction between:

`local configuration -> local authorization state -> remote Google APIs`

and prevents higher layers from confusing a cached credential or local projection with remote Google resource truth.

## Legacy provider finding

`src/lib/googleApi.ts` still contains an older, monolithic Google provider implementation with its own OAuth `tokenClient`, `accessToken`, client-ID lookup and full-scope authorization request. That is a genuine competing authorization implementation and is therefore **not canonical**.

It is deliberately not deleted in this pass because the file also contains the broad Google API surface (Gmail, Docs, Drive, Calendar, Tasks, Sheets, Contacts, Keep, Chat and legacy compatibility exports). Removing its auth machinery atomically requires either migrating all provider calls to the canonical authorization service or introducing an explicit provider credential injection seam. That work is now bounded and must be completed before production transition; it must not be allowed to become a permanent second auth authority.

## State consistency rules

- Only `googleAuthorization.ts` is allowed to own the canonical in-memory Google credential state.
- A Google token is transient authorization state, not durable application data.
- Expired/revoked authorization must not continue to report as connected locally.
- Google resource data returned by APIs is remote state; local UI data may be treated as a cache/projection only when explicitly designed as such.
- Capability authorization is scoped and least-privilege; the old all-scopes provider authorization is transitional.
- Local Elara conversations, memory, Workspace artifacts and settings are not deleted merely because Google authorization is revoked.

## Next extraction target

Replace the legacy `googleApi.ts` OAuth state with injected/canonical authorization from `googleAuthorization.ts`, then migrate remaining direct Google-provider consumers onto the service/runtime boundary. After that, the old full-scope authorization path can be physically removed.
