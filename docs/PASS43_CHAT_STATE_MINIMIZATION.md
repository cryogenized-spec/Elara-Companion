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

The title/rate-limit paths remain good candidates for the next bounded extraction. Full physical removal of the optional compatibility memory props belongs with the application-shell collapse so we do not edit App.tsx opportunistically in this pass.

## Architectural invariant

**Chat requests memory work; Memory owns memory state.**

A future memory backend or persistence implementation should be replaceable without changing `useChatStreamController`.

## Verification

Pass 43 verification completed successfully on the PR head:

```text
npm install               PASS
npm run lint              PASS
npm test                  PASS
npm run build             PASS
npm run benchmark:memory  PASS
```

The repository's normal CI verification also passed on the same PR head.

The temporary Pass 43 verification workflow was then removed before merge.

## Handoff to Pass 44

Pass 44 should continue reducing Chat-specific orchestration while preserving the boundaries completed in Passes 41–43. Priorities are:

1. Extract provider-specific title generation from Chat into an application service/contract.
2. Remove direct rate-limit mutation from Chat and establish the correct runtime/service owner.
3. Reduce local stream bookkeeping where it represents runtime state rather than UI projection state.
4. Preserve Chat's responsibility for translating normalized runtime effects into message projections.
5. Do not reintroduce direct Workspace, Background, Memory, Google, or provider plumbing into Chat.

The optional `memoryState` / `setMemoryState` compatibility props should be physically deleted only when the current shell no longer passes them; do not reopen App.tsx opportunistically inside Pass 44.

Legacy production/reference repository remains untouched.
