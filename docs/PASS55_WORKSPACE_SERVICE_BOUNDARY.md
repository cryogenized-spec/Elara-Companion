# Pass 55 — Workspace service command boundary

Pass 55 strengthens the Workspace application boundary without changing the underlying storage implementation.

## Completed
- Added `workspaceService.selectArtifact(artifactId)` so callers no longer need to know the storage mutation function used to select an artifact.
- Added `workspaceService.removeArtifact(artifactId)` so callers no longer construct deletion state or pass Workspace snapshots into storage.
- Added `workspaceService.updateArtifactById(artifactId, patch)` as the application-shaped update seam for later migrations.
- Migrated `ArtifactsPanel` off direct `workspaceStorage` imports.
- Added focused tests for the application-shaped command API.

## Intentionally unchanged
- `WorkspaceContract` remains compatible with its current storage-shaped API. Pass 55 does not widen this refactor into a contract migration.
- `workspaceStorage.ts` still owns normalization, localStorage persistence, revision/checkpoint mechanics, and artifact-created events.

## Next target
Pass 56 should migrate `WorkspaceView` persistence/checkpoint orchestration behind Workspace services/commands. In particular, `persistCurrent`, `flush`, selection, creation, deletion, rename, checkpointing, and direct `workspaceStorage` imports should be audited and progressively moved out of the visual component.

## Architectural intent
The desired direction remains `UI -> Workspace application service/commands -> storage infrastructure`. Do not create new direct `workspaceStorage` imports in UI components. Avoid changing persistence semantics while moving ownership.
