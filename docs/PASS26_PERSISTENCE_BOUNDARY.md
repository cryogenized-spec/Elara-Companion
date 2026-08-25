# Pass 26 — Persistence Boundary Cleanup

## Completed change

Application feature code must not import the IndexedDB implementation directly for application-level persistence operations.

`src/features/conversations/useConversationController.ts` now routes the destructive `clearAllData` operation through `src/services/applicationPersistenceService.ts` instead of importing `src/lib/db.ts` directly.

The service is an application-facing seam. `src/lib/db.ts` remains the underlying persistence/infrastructure implementation and is not duplicated or moved in this pass.

## Why this boundary exists

The normal conversation/folder/settings/world/memory/portrait synchronization is already owned by `useApplicationStateController`. The remaining direct feature-level DB operation was the explicit destructive reset path. Keeping that operation behind the application persistence service prevents future feature code from reaching around the established boundary.

## Deliberately not changed

`SettingsModal` still contains legacy snapshot/persistence coordination and remains a later extraction target. It is too broad to hide behind a generic persistence facade without first identifying its separate settings, snapshot, Google, and migration responsibilities.

Workspace and background persistence retain their dedicated service boundaries established in earlier passes.

## Handoff invariant

Feature/application code may request application persistence capabilities through services, but must not import the low-level IndexedDB adapter merely to perform an application operation.
