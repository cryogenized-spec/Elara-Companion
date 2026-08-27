# Passes 71–73 — Workspace / Background Runtime Rehabilitation

## Pass 71 — Workspace ownership audit

Workspace application operations are owned by `src/services/workspaceService.ts`. Persistence is isolated behind `src/services/workspacePersistenceService.ts`. The underlying `src/lib/workspaceStorage.ts` remains the storage implementation and retains the existing localStorage key/schema and normalization behavior.

`src/services/workspaceEditorService.ts` delegates application mutations to `workspaceService` and keeps only editor/revision-specific operations locally. UI components are prohibited from importing `workspaceStorage` directly.

## Pass 72 — Workspace/background reconciliation

`src/services/workspaceBackgroundService.ts` consumes `workspacePersistenceService` rather than importing the low-level storage module. Background reconciliation persists the authoritative Workspace result first, then publishes `artifact.changed` events for the concrete created/modified artifacts. Created IDs take precedence when the same artifact also appears in the modified list.

The Workspace editor and background paths therefore share the same application boundary instead of maintaining parallel persistence choreography.

## Pass 73 — Recovery and idempotency proof

Existing Workspace persistence tests cover malformed storage recovery, schema normalization, dangling active-artifact repair, artifact creation persistence, and invalid active-artifact selection. Existing background reconciliation tests cover missing workspace output, missing artifact IDs, deterministic created/updated event classification, and duplicate artifact IDs within a completion result.

`src/services/backgroundApplicationService.ts` additionally guards terminal reconciliation with an in-memory `reconciledJobIds` set so a repeated terminal status for the same durable job is not reconciled twice during the same application lifetime.

The architectural lock test now enforces:

- UI components do not import `workspaceStorage` directly.
- background reconciliation uses `workspacePersistenceService`.
- editor mutations use `workspaceService`.
- terminal background reconciliation retains its per-job idempotency guard.

## Result

Workspace state remains backward-compatible at the persistence layer while application ownership is centralized. No Workspace data/schema migration was introduced during these passes. Legacy repository `cryogenized-spec/Elara-companion-app-v2` remains untouched.
