# Pass 31 — Feature / Module Boundary Audit

## Objective

Verify that Elara's major capabilities can evolve independently without direct feature-to-feature coupling or new parallel ownership.

## Canonical module rule

A feature under `src/features/<feature>/` may depend on shared contracts, domain modules, services and runtime boundaries, but it must not import another feature directly.

Cross-feature coordination belongs in an application/service/runtime boundary rather than in a sibling feature implementation.

## Executable guard

`src/lib/__tests__/featureBoundaries.test.ts` recursively scans `src/features` and fails when a feature module resolves a relative import into a different feature directory. This prevents new direct feature-to-feature coupling from entering the codebase.

The guard deliberately does **not** ban a feature from using shared services or from still containing transitional infrastructure imports. Those are separate extraction programmes already mapped in the architecture plan. The goal here is to prevent lateral feature entanglement while those deeper migrations proceed.

## Audit findings

### Chat

Chat remains the heaviest orchestration feature. `useChatStreamController` still coordinates model execution, background jobs, Workspace effects, memory mutation, rate limits and legacy persistence. This is not considered a healthy final boundary, but each responsibility already has a named future programme/pass: runtime isolation, Workspace service isolation, memory service isolation, background reconciliation, persistence cleanup, and later application contracts.

It must not be solved by allowing other features to import the Chat controller or by creating a second Chat implementation.

### Workspace

Workspace has a canonical service boundary. Consumers should use `workspaceService` rather than importing `workspaceStorage` directly. Remaining direct storage consumers are transitional extraction targets, not a second Workspace feature implementation.

### Memory

Memory has a canonical service boundary and an authoritative IndexedDB state. Retrieval is a projection of that state. The feature layer must not create another memory authority or import another feature's memory implementation.

### Google

Google has a canonical authorization/service boundary. Remote Google resources remain remote-authoritative. The legacy `googleApi.ts` OAuth implementation remains transitional and must not become a second application-facing Google integration.

### Background runtime

Background execution is its own runtime/service boundary. Features may request background work through that boundary, but a feature must not become a second background job store or recovery owner.

### Settings / model tuning / Voice

Settings and model/voice controls are canonical capability surfaces. Future modules should consume settings contracts rather than directly reconstructing or duplicating the settings subsystem.

## Dependency direction

Preferred direction:

`UI -> feature/application orchestration -> domain/services/runtime -> infrastructure/providers`

Forbidden architectural direction:

`feature A -> feature B`

and especially:

`UI -> provider implementation`,
`feature -> another feature's persistence owner`,
`service -> React component`,
`domain -> React/browser/external provider implementation`.

## Why this pass is intentionally narrow

The audit identified substantial remaining coupling inside Chat, but extracting all of it belongs to subsequent passes already present in the master plan. This pass therefore establishes the module contract and executable guard rather than performing a risky multi-domain rewrite.

The repository must continue to reduce the transitional Chat/infrastructure coupling in later passes; documenting it does not make it canonical.
