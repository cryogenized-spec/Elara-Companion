# Pass 42 — Chat Workspace + Background Boundary

## Objective

Remove Chat's remaining direct Workspace persistence and durable-background lifecycle choreography without changing externally visible Chat behavior.

## What changed

`src/services/chatWorkspaceService.ts` now owns Workspace side effects produced by Chat runtime chunks and Chat-generated canvases.

`useChatStreamController` no longer imports `workspaceStorage`, calls `saveWorkspace` directly, or calls `saveAgentArtifact` directly. Runtime Workspace updates are routed through `applyChatRuntimeWorkspaceUpdate`, and generated canvases are persisted through `persistChatCanvases`.

`src/services/chatBackgroundService.ts` now owns the accepted durable-job lifecycle: creation, persistence, waiting, normalized completion delivery, cleanup, and completion-event publication.

`chatRuntimeService` now delegates durable execution to `chatBackgroundService`. It remains responsible for choosing the execution route and for provider transport, but it no longer implements background-job persistence/wait/removal choreography itself.

## Critical invariants

- Durable execution remains authoritative after job acceptance; Chat does not start a second Gemini execution after an accepted background job.
- Successful durable completion still reaches Chat as a normalized runtime chunk containing response text, finish reason, Workspace state, and touched artifact ids.
- Failed terminal jobs still surface as errors and are not removed as successful completions.
- Chat-generated canvases continue to become Workspace artifacts with the same title/content/type/artifact-id semantics.
- Existing Workspace updates from streamed tool/runtime chunks continue to be persisted.
- `artifact.changed` and `background.job.completed` event boundaries remain available for downstream consumers.
- The legacy repository remains untouched.

## Deliberately deferred

This pass does not attempt to minimize remaining Chat state, remove title-generation provider mechanics, or rehabilitate the broader Workspace implementation. Those remain owned by Pass 43+ and the later Workspace programme.

## Verification target

Focused tests cover the background execution boundary. Repository verification remains:

```bash
npm run lint
npm test
npm run build
npm run benchmark:memory
```

## Handoff to Pass 43

Pass 43 should treat the following as the remaining Chat-local responsibilities to audit for state ownership rather than reopening the Workspace/background implementation:

- assistant-message projection
- Chat streaming/thinking UI state
- cancellation state
- local stream bookkeeping (`accumulatedText`, `streamedThoughts`, artifact-id accumulation)
- `durableJobAccepted` and related transitional runtime flags
- memory-state mirror passed into Chat
- provider-specific title generation
- rate-limit mutation

Architectural invariant:

**Chat may translate normalized runtime effects into Chat projections, but it must not persist or orchestrate another domain's implementation.**
