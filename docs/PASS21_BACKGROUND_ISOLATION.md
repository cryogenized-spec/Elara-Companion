# Pass 21 — Background/runtime isolation

## Result

Established `src/services/backgroundRuntimeService.ts` as the application-facing background execution boundary.

`src/runtime/useBackgroundRuntimeController.ts` now consumes the service instead of importing `src/lib/backgroundChatClient.ts` directly.

## Canonical ownership

The service exposes background runtime configuration, enablement, persisted-job records, job creation, status retrieval and polling/waiting. The existing `backgroundChatClient.ts` remains the underlying transport and local job-record implementation for now.

The React controller remains responsible for React-specific reconciliation: updating conversation messages and triggering user-facing completion notifications. It must not become a second transport or persistence owner.

## Deliberately preserved

The background client still reconciles completed Workspace results because that behaviour currently bridges durable background execution back into Workspace persistence. Moving that reconciliation is deferred to a later pass where the Workspace/runtime event boundary can be established without creating a third Workspace owner.

## Why

This pass is an isolation step, not a runtime rewrite. The goal is to prevent new feature code from learning the background transport/storage implementation while preserving behaviour and keeping one implementation underneath the boundary.

The legacy/reference repository remains untouched.
