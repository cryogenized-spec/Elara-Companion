# Pass 19 — Workspace service isolation

Pass 19 establishes the application-facing Workspace service boundary.

`src/services/workspaceService.ts` is now the preferred application capability seam for workspace loading, persistence, active-artifact selection, artifact creation/update/deletion, and agent artifact operations.

The existing `src/lib/workspaceStorage.ts` remains the underlying persistence/infrastructure implementation for now. This pass deliberately does not rewrite its normalization, localStorage, revision/checkpoint, or artifact-event mechanics.

`useWorkspaceController` now depends on `workspaceService` rather than importing `workspaceStorage` directly.

The root-level `patch_workspaceStorage.cjs` one-shot rewrite script was unreferenced and has been removed. It was migration tooling, not production functionality.

Remaining direct Workspace-storage consumers are transitional extraction targets for later passes. They must move behind the service boundary rather than creating new direct imports.
