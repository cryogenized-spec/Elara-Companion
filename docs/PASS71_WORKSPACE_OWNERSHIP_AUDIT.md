# Pass 71 — Workspace Ownership Audit

## Scope

Audit the post-Stage-1 Workspace implementation before making further structural changes.
The goal is to establish ownership, persistence authority, mutation authority, background interaction, and UI-facing projections without changing runtime behaviour.

## Current canonical pieces

### `src/services/workspaceService.ts`

Application-facing Workspace capability boundary. It currently delegates core reads/writes and artifact mutations to `lib/workspaceStorage` and exposes application-shaped helpers such as `selectArtifact`, `removeArtifact`, and `updateArtifactById`.

### `src/services/workspaceEditorService.ts`

Editor/revision-facing boundary. It currently delegates Workspace reads/writes and revision operations to `lib/workspaceStorage` and `lib/revisionUtils`.

### `src/services/workspaceBackgroundService.ts`

Background-result reconciliation boundary. It accepts a background job result, persists the returned Workspace, and publishes `artifact.changed` events for the reported created/modified artifacts.

### `src/lib/workspaceStorage.ts`

Current physical persistence owner. It owns the `elara_workspace_data` and schema keys, in-memory cache, normalization, localStorage persistence, active-artifact handling, artifact CRUD, agent artifact writes, and the low-level browser event emission used by legacy consumers.

## Ownership matrix

| Responsibility | Current owner | Desired owner | Status |
|---|---|---|---|
| Workspace read/normalization | `workspaceStorage` | Workspace infrastructure/persistence adapter | Transitional |
| Workspace persistence | `workspaceStorage` | Workspace persistence adapter | Transitional |
| Active artifact selection | `workspaceStorage` via service façade | Workspace service | Boundary present |
| Artifact create/update/delete | `workspaceStorage` via services | Workspace service/domain operations | Boundary present; implementation still low-level |
| Agent artifact creation/update | `workspaceStorage` | Workspace application service | Transitional |
| Revision/checkpoint mechanics | `revisionUtils` + editor service | Workspace revision service | Boundary present |
| Background reconciliation | `workspaceBackgroundService` | Workspace/background application boundary | Good; requires idempotency proof |
| Artifact change notification | `workspaceBackgroundService` + storage event | Application event boundary | Transitional dual signalling |
| UI Workspace projection | React callers | UI/application layer | Needs repository-wide import census |

## Findings

1. There is already a viable application boundary, so the next work should not invent another Workspace abstraction merely for naming purposes.

2. `workspaceService` and `workspaceEditorService` are currently two façades over the same low-level storage owner. This is the principal structural issue for Programme 2. They have different responsibilities, but their shared dependency on `workspaceStorage` means the actual infrastructure boundary has not yet been fully isolated.

3. `workspaceStorage` owns both persistence and domain-shaped mutation logic. This is the key extraction target. The safe direction is to preserve its serialization/cache primitives while moving application mutation semantics upward into the Workspace service layer.

4. `workspaceBackgroundService` directly imports `saveWorkspace` from `workspaceStorage`. This is a concrete boundary violation and should be removed in Pass 72 or the first safe reconciliation pass. Its dependency should become an injected Workspace persistence/application contract rather than the storage module itself.

5. Workspace change notification currently has two concepts: the low-level `elara:artifact-created` browser event in `workspaceStorage` and the application-level `artifact.changed` event used by background reconciliation. These should not be allowed to become competing event authorities. The application event bus should become authoritative for domain/application events; the browser event should only survive where a verified UI compatibility need remains.

6. Existing Workspace recovery tests demonstrate useful defensive behaviour: malformed stored data falls back safely, dangling active artifact IDs are repaired, and artifact persistence survives reload scenarios. These behaviours must be preserved while ownership moves.

## Pass 72 surgical target

Do not rewrite Workspace wholesale.

First introduce an explicit Workspace persistence contract behind the current storage implementation.
Then change `workspaceBackgroundService` and `workspaceEditorService` to consume the application/service boundary rather than importing `lib/workspaceStorage` directly where practical.
Keep the current serialization/cache implementation intact until equivalent behaviour is proven.

Acceptance criteria:

- No UI component directly imports `lib/workspaceStorage`.
- Background reconciliation no longer imports `saveWorkspace` directly from `lib/workspaceStorage`.
- Existing Workspace persistence/recovery behaviour remains unchanged.
- Revision operations continue to create append-only restore/checkpoint revisions.
- `artifact.changed` remains deterministic and idempotent for duplicate artifact IDs.
- No second Workspace persistence authority is introduced.
