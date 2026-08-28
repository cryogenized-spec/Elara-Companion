# Stage 2 — Google Hub Pass 2: Capability Contract + Registry

Status: IMPLEMENTED
Date: 2026-08-28
Base: `main` at `59283e33baf10093795793764b9f9ec15144c8b6`

## Purpose

Implement the extensibility boundary identified by Google Hub Pass 1 without changing the existing Google service operations or replacing the Settings UI yet.

This pass establishes a registry-driven capability model that later Hub UI passes can consume.

## What was implemented

### 1. Provider-neutral capability contract

Added `src/googleHub/capabilityTypes.ts`.

`IntegrationCapability<Provider, Permission>` is intentionally independent of React and independent of Google OAuth implementation details. It describes:

- stable capability id and version
- provider identity
- display name and description
- category
- icon/panel keys
- authorization mode and provider-owned permissions
- optional external application URL
- user-facing action metadata

`GoogleCapabilityDefinition` specializes that contract to the existing Google capability policy.

### 2. Capability actions

Actions now carry explicit metadata for:

- action id
- label and description
- operation kind
- effect (`read`, `write`, `external-write`, `auth-change`)
- required provider permissions
- confirmation requirement

Consequential external actions therefore remain visibly distinct from reads and from local draft-style operations.

### 3. Google capability registry

Added `src/googleHub/googleCapabilityRegistry.ts`.

The registry owns capability composition and provides:

- `register` / `registerAll`
- lookup and existence checks
- category lookup
- action ownership lookup
- required permission lookup
- required OAuth scope derivation through the canonical Google policy
- authorization checks against a granted-scope string
- defensive copies from read APIs

Registration rejects:

- duplicate capability ids
- duplicate action ids across capabilities
- unnormalized identifiers
- unsupported contract versions
- empty required permissions
- unmapped Google permissions
- malformed capability/action metadata

The registry does not execute provider operations.

### 4. Initial Google catalog

Added `src/googleHub/googleCapabilities.ts` with the first nine Hub capabilities:

- Gmail
- Calendar
- Drive
- Docs
- Sheets
- Tasks
- Keep / Reference
- Contacts
- Google Chat

Each capability owns its own action catalogue and authorization requirements.

The catalog deliberately uses read access as the base service authorization where possible. Stronger write/send permissions are attached to the specific mutating actions.

### 5. Public Hub entry point

Added `src/googleHub/index.ts`.

It exports the contract, registry, catalog, an isolated `createGoogleCapabilityRegistry()` factory, and a shared read-oriented default registry.

UI code should consume the registry rather than hard-code a service list.

### 6. Canonical capability type cleanup

Updated `src/contracts/index.ts` so `GoogleCapability` is re-exported from `src/lib/googleCapabilityPolicy.ts` instead of maintaining a second copy of the union.

This prevents the application contract and OAuth policy from drifting apart.

### 7. Tests

Added `src/googleHub/__tests__/googleCapabilityRegistry.test.ts` covering:

- initial capability inventory
- stable metadata
- canonical scope derivation
- authorization checks
- stronger mutation permissions and confirmation metadata
- duplicate capability/action rejection
- unmapped permission rejection

## Deliberate non-goals

This pass does **not**:

- replace `SettingsModal`
- remove the existing `GoogleCapabilitySettingsPanel`
- move provider service implementations
- implement Activity or Permissions UI
- change OAuth/token behaviour
- execute capability actions through the registry
- implement Calendar/Gmail/etc. panels

Those belong to later passes.

## Architecture after Pass 2

```text
                         Google Hub UI (future)
                                  |
                                  v
                     +---------------------------+
                     | GoogleCapabilityRegistry  |
                     +---------------------------+
                       |       |        |       |
                       v       v        v       v
                    Gmail  Calendar   Drive   ...
                       |       |        |
                       +-------+--------+
                               |
                               v
                 Provider-owned service adapters
                               |
                               v
                  googleCapabilityPolicy.ts
                               |
                               v
                     Google OAuth / scopes
```

The important boundary is that the Hub knows capability metadata and composition, while provider services continue to own actual API operations.

## Pass 3 hand-off

Pass 3 should establish a single runtime capability/authorization state model around the existing `googleAuthorization` implementation.

The intended relationship is:

**one Google identity** → **incremental capability grants** → **registry-derived service/action state**.

The registry should remain declarative. Runtime state should live elsewhere and be injected/read by the Hub rather than making the registry mutable authorization state.

## Verification note

The repository is public, but the execution environment used for this pass could not resolve `github.com`, so a local `npm test` run was not possible in this session. The test suite was added to the repository and the implementation was reviewed against the existing TypeScript contracts and canonical Google capability policy.

## Resume marker

**Next work item: Stage 2 — Pass 3: Unified Google authorization/capability state.**

Do not redesign the service layer from scratch. Reuse the existing authorization and capability policy boundaries documented in `docs/stage2/google-hub-pass1-audit.md`.
