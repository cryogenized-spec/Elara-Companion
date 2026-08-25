# Pass 41 — Memory + Tool Boundary

## Objective

Move Chat's memory extraction/persistence and shared agent-tool side effects behind application services so the Chat feature no longer owns provider calls, database writes, or tool-observability side effects.

## What moved

`src/services/chatMemoryService.ts` now owns Chat's post-response memory extraction path. It preserves the existing direct Gemini route and `/api/memory/analyze` fallback, then reduces and persists actions exclusively through `MemoryContract`.

`src/services/agentToolExecutionService.ts` now owns shared agent-tool execution side effects. It preserves the existing tool registry execution, browser live-tool activity reporting, and `artifact.changed` publication.

The server Chat route and scheduled automation executor use the same tool execution boundary, while `geminiDirectClient` delegates through it as well.

## What was deliberately not changed

- Memory action semantics in `memoryProcessor`.
- Memory storage implementation in `memoryService` / IndexedDB.
- Agent tool plugin implementations or capability policy.
- Gemini model/tool-call iteration behavior.
- Chat UI projection, thinking parsing, artifact projection, title generation, watchdogs, or error presentation.

## Critical invariants

- Direct memory extraction continues to use the configured Gemini API key when available.
- Backend memory analysis remains the fallback when no local API key is configured.
- Memory actions are reduced and persisted through the canonical MemoryContract.
- Tool execution still records browser live-tool activity and publishes created-artifact events exactly as before.
- Server and automation tool execution use the same shared boundary as direct Chat execution.
- `chatRuntime.ts` contains runtime/configuration helpers only; it no longer owns tool execution side effects.
- No production cutover or legacy repository mutation occurs in this pass.

## Verification

The repository-owned production verification workflow passed after the refactor, including TypeScript verification and background-runtime typechecking. The temporary verification workflow self-removed after success.
