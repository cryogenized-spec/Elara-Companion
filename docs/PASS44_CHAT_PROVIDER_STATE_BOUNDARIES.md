# Pass 44 — Chat Provider + State Boundaries

## Objective

Continue reducing Chat-specific orchestration by removing provider-specific title-generation plumbing and direct rate-limit storage mutation from `useChatStreamController`.

## What changed

`src/services/chatTitleService.ts` now owns conversation-title provider selection and transport. It handles the BYOK direct Gemini path and the backend `/api/chat/title` path, returning only a normalized title result to Chat.

`src/services/chatRateLimitService.ts` now owns the application boundary for request accounting. Chat asks the service to record a request and no longer imports the storage implementation directly.

`useChatStreamController` now depends on `generateChatConversationTitle()` and `recordChatRequest()` rather than knowing how either concern is implemented.

## Architectural result

Before:

`Chat → geminiDirectClient / fetch('/api/chat/title')`

`Chat → storage.incrementRateLimit → localStorage`

After:

`Chat → ChatTitleService → provider`

`Chat → ChatRateLimitService → storage`

The implementation beneath those boundaries remains intentionally unchanged for now. A later infrastructure/monolith pass can replace the storage implementation without reopening Chat.

## Deliberately deferred

This pass does not attempt to extract the watchdog, stream accumulators, artifact-id collection, or final message projection. Those are runtime/UI responsibilities and need a separate boundary decision rather than being bundled into provider cleanup.

The optional `memoryState` / `setMemoryState` compatibility props remain transitional shell debt from Pass 43.

## Verification

Pass 44 verification completed successfully on the PR head:

```text
npm install               PASS
npm run lint              PASS
npm test                  PASS
npm run build             PASS
npm run benchmark:memory  PASS
```

The temporary Pass 44 verification workflow was physically removed before merge. The repository's normal CI path was not allowed to become a reason to leave temporary verification infrastructure behind.

## Handoff to Pass 45

Pass 45 should reassess Google/provider ownership now that Chat no longer directly owns title-provider mechanics or memory state. Start with a Google provider inventory and canonical-path audit rather than editing Chat further.

Specifically establish for every Google capability:

- canonical authorization owner
- current token/credential owner
- service adapter owner
- direct UI/feature callers
- legacy compatibility callers
- webhook and callback ownership
- scope requirements
- obsolete `googleApi` paths still reachable from the active architecture

Do not move provider logic back into Chat simply because a new feature needs it.

Architectural invariant:

**Chat requests capabilities; services own provider and persistence mechanics.**

Legacy production/reference repository remains untouched.
