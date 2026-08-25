# Pass 43 — Chat State Minimization

## Objective

Remove stale cross-domain state ownership from the Chat feature without reopening the Workspace/background boundaries completed in Pass 42.

## What changed

`src/services/chatMemoryService.ts` now loads the authoritative memory state through `MemoryContract.load()` before memory extraction. Chat no longer supplies a React-owned memory snapshot to the memory subsystem for extraction or persistence.

`src/features/chat/useChatStreamController.ts` no longer reads or mutates `memoryState` / `setMemoryState`. The two inputs remain optional inert compatibility fields temporarily so the current application shell does not need a simultaneous shell rewrite. They are transitional debt owned by the later App/shell collapse and should be physically removed when the shell no longer passes them.

The memory regression test was updated to prove that the service passes the current `MemoryContract` state to the analyzer and persists the reduced result back through the same contract.

## State ownership result

Before:

`App React memoryState → Chat controller → Chat memory service → MemoryContract`

After:

`MemoryContract → Chat memory service`

Chat can request memory work, but it no longer participates in memory-state synchronization.

## Deliberately deferred

The following remain in Chat and are explicitly deferred rather than silently mixed into this pass:

- stream accumulators (`accumulatedText`, `streamedThoughts`)
- watchdog/lifecycle bookkeeping
- local artifact-id accumulation
- durable acceptance flag
- provider-specific title generation
- rate-limit mutation
- final Chat message projection

The title/rate-limit paths remain good candidates for the next bounded extraction once the current branch is verified. Full physical removal of the optional compatibility memory props belongs with the application-shell collapse so we do not edit App.tsx opportunistically in this pass.

## Architectural invariant

**Chat requests memory work; Memory owns memory state.**

A future memory backend or persistence implementation should be replaceable without changing `useChatStreamController`.

## Verification target

Run the normal repository checks before merge:

```text
npm run lint
npm test
npm run build
npm run benchmark:memory
```
