# Pass 45 — Google Provider Inventory

## Objective

Establish the canonical ownership map for Google integrations before any OAuth or legacy deletion work.

## Repository findings

The active contract layer already exposes Google through `googleContract` in `src/contracts/implementations.ts`. The contract delegates authorization and capability checks to `googleWorkspaceService`, specifically `googleIdentity` and `googleCapabilities`.

This is the current architectural entry point for feature/application consumers:

`feature/application code → GoogleContract → googleWorkspaceService → Google APIs`

The legacy provider surface still exists under `src/lib/googleApi.ts`. It contains a broad OAuth/token client, a large global scope set, and direct Gmail/Docs/Drive API implementations. This file is therefore classified as **legacy/transitional infrastructure**, not the canonical feature entry point.

The repository also contains additional Google-related implementation surfaces that must be reconciled before deletion:

- `src/lib/googleRuntime.ts`
- `src/lib/googleAuthLifecycle.ts`
- `src/lib/googleAuthLifecycleTool.ts`
- `src/lib/googleCapabilityPolicy.ts`
- `src/lib/googleAgentTools.ts`
- `src/lib/googleAgentOperationalTools.ts`
- `background-runtime/googleVault.ts`
- `background-runtime/src/googleTools.ts`
- `src/services/googleWorkspaceService.ts`

These are not all equivalent. Some are adapters, tool registrations, compatibility paths, or background-runtime infrastructure. They require ownership tracing rather than blanket removal.

## Canonical ownership map

### Authorization / identity

Canonical owner: `src/services/googleWorkspaceService.ts` via `googleIdentity`.

Responsibilities to preserve behind the boundary:

- access-token acquisition
- authorization state
- client-id access
- capability authorization
- revocation

Legacy/token-global ownership in `src/lib/googleApi.ts` must not become a second authority.

### Capability policy

Canonical owner candidate: `googleCapabilities` / related capability-policy service.

The policy layer should own capability-to-scope mapping. Callers should request capabilities rather than constructing scope strings themselves.

### Google API adapters

The preferred long-term ownership is service/adaptor modules beneath `googleWorkspaceService`, split by capability or provider surface as required. Large legacy functions in `googleApi.ts` are implementation material to be migrated or retired, not copied into new feature modules.

### Agent tools

Google agent tools are consumers/adapters of the Google capability boundary. They should not own OAuth credentials or become independent authorization authorities.

### Background runtime

Background Google tooling may retain runtime-specific adapters, but credential acquisition must resolve through the canonical Google identity boundary. `googleVault` and background Google tools require explicit review for whether they represent a legitimate infrastructure boundary or legacy duplication.

## Scope/security observations

`src/lib/googleApi.ts` currently requests a very broad combined scope set covering Gmail, Calendar, Tasks, Docs, Drive, Sheets, Keep, Contacts and Chat. This is a major candidate for capability-based least-privilege consolidation.

This pass intentionally does not change scopes, OAuth flows, token behavior, or revoke/delete files. Pass 46 should first consolidate authorization authority and then perform security-sensitive changes with regression coverage.

## Classification

Canonical:

- `src/contracts/implementations.ts` → `googleContract`
- `src/services/googleWorkspaceService.ts` → canonical Google identity/capability service boundary

Transitional / requires migration review:

- `src/lib/googleRuntime.ts`
- `src/lib/googleAuthLifecycle.ts`
- `src/lib/googleAuthLifecycleTool.ts`
- `src/lib/googleCapabilityPolicy.ts`
- `src/lib/googleAgentTools.ts`
- `src/lib/googleAgentOperationalTools.ts`
- `background-runtime/googleVault.ts`
- `background-runtime/src/googleTools.ts`

Legacy / deletion candidate after proof:

- `src/lib/googleApi.ts` as an independent all-in-one provider/credential owner

## Pass 46 starting point

Consolidate OAuth authority around `googleIdentity` and ensure every Google caller reaches credentials through that boundary.

Before changing OAuth behavior, trace all callers of:

- `requestGoogleAuth`
- `getAccessToken`
- token globals/state
- client-id getters
- scope constants
- capability authorization
- revoke/disconnect

Then design the replacement path and regression matrix. Do not delete `googleApi.ts` until every legitimate consumer is migrated and verified.

Legacy production/reference repository remains untouched.
