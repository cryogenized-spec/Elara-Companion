# Pass 27 — Projection Cleanup

## Objective

Reduce stored copies that had become competing operational authorities, while preserving projections that still serve a deliberate presentation or recovery role.

## Completed

Memory retrieval no longer reads the localStorage structured memory mirror. `contextManager.ts` now builds retrieval context from the authoritative `MemoryScratchpadState` held by `memoryService`, with an optional explicit state supplied by callers when available.

The localStorage memory mirror (`elara_memory_context_mirror_v3`) is now recovery-only. Normal memory loads and saves no longer rewrite it. If IndexedDB is unavailable, `db.ts` may still use the existing mirror as an emergency fallback. This preserves a recovery path without allowing stale mirrored memory to drive normal retrieval.

The user-profile notes and active scratchpad projection helpers were moved into `contextProjectionStorage.ts`. `db.ts` no longer depends on `contextManager.ts`, preventing a dependency cycle between the context builder and the memory service.

`memoryService.ts` now maintains the most recently authoritative runtime memory state and receives synchronization notifications from the persistence boundary. This keeps direct/legacy persistence callers from leaving the runtime retrieval projection stale.

The contextual-memory regression test now supplies an authoritative memory state directly rather than seeding the legacy localStorage mirror.

## Projection invariants

- IndexedDB memory state is authoritative.
- The memory service runtime state is a cache/projection of that authority, never an independent store.
- The generated persistent scratchpad remains a derived text projection for compatibility/context presentation.
- The structured localStorage memory mirror is recovery-only and must not be used for normal retrieval.
- Derived projections must never become the read path for domain decisions when the canonical state is available.

## Deliberately deferred

Some direct persistence callers remain elsewhere in the application, including legacy chat/runtime code. They are not part of this projection pass unless they affect projection consistency; they remain explicit targets for later state/persistence boundary work.

Likewise, the broader SettingsModal persistence cluster remains deferred so its multiple responsibilities can be separated rather than hidden behind a generic persistence wrapper.
