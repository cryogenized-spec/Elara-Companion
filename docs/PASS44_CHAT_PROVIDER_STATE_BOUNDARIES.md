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

## Verification target

```text
npm install
npm run lint
npm test
npm run build
npm run benchmark:memory
```

## Handoff

Pass 45 should reassess Google/provider ownership now that Chat no longer directly owns title-provider mechanics or memory state. Do not move provider logic back into Chat simply because a new feature needs it.

Architectural invariant:

**Chat requests capabilities; services own provider and persistence mechanics.**

Legacy production/reference repository remains untouched.
