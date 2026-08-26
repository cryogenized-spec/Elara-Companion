# Pass 57 — Workspace / Background Runtime reconciliation

This pass separates background transport from Workspace/application reconciliation.

## Boundary after this pass

`backgroundChatClient` owns HTTP, authentication headers, job creation, status reads, and polling only.

`backgroundRuntimeService` owns application-level job orchestration: supplying the current Workspace when a chat job is created and reconciling the terminal Workspace result exactly once after `waitForJob` completes.

`workspaceBackgroundService` owns Workspace persistence and `artifact.changed` event emission. It combines created and modified artifact IDs deterministically and avoids duplicate events when an artifact appears in both lists.

`chatBackgroundService` remains the owner of the durable Chat completion lifecycle and publishes `background.job.completed` once after a successful `waitForJob` result. The transport client no longer emits completion events, preventing duplicate completion notifications during repeated polling.

## Verification requirements

Run lint, tests, production build and memory benchmark. Specifically verify:
- background transport has no Workspace persistence/event imports;
- created and modified artifact results reconcile to local Workspace;
- an artifact listed as both created and modified emits one `created` event;
- polling a terminal job does not itself publish repeated completion events;
- Chat background completion remains emitted once by the Chat background service.
