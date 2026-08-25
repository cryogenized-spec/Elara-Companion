# Pass 20 — Memory Service Isolation

Status: complete.

`src/services/memoryService.ts` is now the application-facing memory boundary. It owns memory load/save operations over the canonical IndexedDB store and exposes the memory action reducer without exposing storage mechanics to application orchestration.

The application state controller now uses this service for memory hydration and persistence. `src/lib/db.ts` remains the persistence adapter, while `src/lib/memoryProcessor.ts` remains the mutation/consolidation implementation.

The older `src/lib/memoryStorage.ts` remains in place because it contains legacy-schema normalization/defaults and localStorage compatibility behaviour that has not yet been proven safe to delete. That is transitional compatibility, not a second application owner.

No memory schema, mutation semantics, persistence format, or UI behaviour were intentionally changed in this pass.
