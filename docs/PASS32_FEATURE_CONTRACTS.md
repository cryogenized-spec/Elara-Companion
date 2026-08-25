# Pass 32 — Feature Contracts

## Objective

Define stable interfaces between major capabilities so feature/application code depends on contracts rather than implementation details.

## Contracts established

`src/contracts/index.ts` defines stable application-facing contracts for:

- Conversation ownership
- Memory ownership
- Workspace ownership
- Google identity/capabilities
- Background runtime
- Gemini runtime/streaming
- Chat's capability bundle
- Assistant stream updates as domain-facing payloads

The contract module intentionally imports only shared domain types from `src/types.ts`. It does not import provider, persistence, service, or runtime implementation modules.

## Implementation bridge

`src/contracts/implementations.ts` adapts the existing canonical service/runtime implementations to those contracts and exposes `createChatCapabilityBundle()` for dependency injection.

This gives the application a stable seam without requiring the internal providers to move immediately.

## Current canonical providers

- Memory → `memoryService`
- Workspace → `workspaceService`
- Google → `googleWorkspaceService`
- Background runtime → `backgroundRuntimeService`
- Gemini runtime → `geminiRuntimeService`

## Contract invariant

A consumer may depend on a contract without knowing whether its implementation is backed by IndexedDB, localStorage, Google OAuth, a remote background server, Gemini, or another future provider.

Changing provider mechanics must not require consumers to change so long as the contract remains compatible.

## Verification

`src/contracts/__tests__/featureContracts.test.ts` verifies that the assembled Chat capability bundle exposes every required contract operation.

This is contract-surface coverage, not full behavioural testing of each subsystem; behavioural regression coverage remains in the subsystem-specific test suites.

## Deliberately deferred adoption

The existing Chat controller is still a transitional integration hub and does not yet consume the bundle exclusively. That physical migration belongs to the deeper extraction work already identified in Pass 31 and the runtime/service passes.

Pass 32 therefore establishes the contract boundary without creating a second orchestration system or performing a risky full-controller rewrite.

## Future-thread handoff

Do not create new feature-to-provider calls where a contract already exists. New consumers should depend on `src/contracts` and should obtain implementations through the application composition layer. Existing transitional callers should be migrated when their owning extraction pass is reached.
