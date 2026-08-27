# Final Architecture Gate

This record marks the final Stage 4 proving checkpoint for the Elara architectural rehabilitation.

## Integrated baseline

Stage 3 was integrated into `main` as a two-parent merge commit so the verified Stage 3 tree is preserved while retaining the pre-existing `main` history. The legacy repository remains the protected reference.

## Canonical boundaries being locked

- Chat provider execution remains behind the Gemini runtime contract.
- Specialised OOC execution is service-owned and explicitly tool-free.
- Google OAuth/token lifecycle has one authority.
- `googleApi` remains compatibility-only and contains no independent OAuth implementation.
- Workspace application mutation belongs to `workspaceService`.
- Workspace persistence belongs behind `workspacePersistenceService`.
- Background Workspace reconciliation uses the persistence boundary and is idempotent per durable job.
- Historical Keep-compatible local data belongs to `referenceArchiveService`; the old Keep implementation is deleted.
- Chat context assembly belongs to `chatContextService`; `contextManager` is compatibility-only.
- Settings UI uses application-owned persistence, diagnostics, Calendar, and Google boundaries.
- UI components must not directly reach low-level Google, Workspace, persistence, OAuth, or model execution internals.

## Final acceptance

Stage 1.5 is ready to close only after the exact integrated tree has passed the repository's production verification, architectural locks, persistence/reload/recovery checks, and final source census with no unexplained duplicate ownership.

After that gate, feature work may proceed against the canonical architecture. Future changes should extend an existing owning service/contract rather than create parallel implementation paths.
