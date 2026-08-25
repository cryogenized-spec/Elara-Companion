# Pass 39 — Chat Dependency Inventory

## Objective

Map the current `useChatStreamController` completely before further Chat surgery. This pass is intentionally audit-only: no runtime implementation is changed here. The output is the authoritative extraction map for Passes 40–44.

## Current controller surface

`src/features/chat/useChatStreamController.ts` is currently the main remaining integration hub for Chat. The hook exposes two application operations:

- `streamAssistantResponse(...)`
- `generateConversationTitle(...)`

The only confirmed UI consumer is the application shell (`src/App.tsx`). The controller therefore sits directly between the shell and nearly every agent subsystem.

## Direct dependencies

### React / application state

The controller directly receives and mutates:

- `conversations`
- `settings`
- `memoryState`
- `setConversations`
- `setMemoryState`
- `setIsStreaming`
- `abortControllerRef`
- `userHasScrolledUpRef`

This means the controller still owns application-shell state mutation rather than returning domain results/commands to the shell.

### Conversation/message domain

It directly creates and mutates assistant `Message` records, including:

- streaming state
- thinking state
- error state
- content
- canvases
- artifact IDs
- raw thoughts
- parsed thought steps
- thought duration
- background job ID

It also directly decides when an assistant placeholder is created, finalized, or changed to an error message.

### Runtime/model execution

The controller currently contains three runtime paths:

1. Durable background execution through `createBackgroundChatJob()` / `waitForBackgroundChatJob()`.
2. Direct client execution through `runDirectGeminiStream()`.
3. Backend SSE execution through `/api/chat/stream`.

It therefore knows:

- provider selection
- API-key presence
- model selection
- model temperature/top-p/top-k
- max output tokens
- thinking budget
- request serialization
- SSE decoding
- stream termination
- HTTP error translation
- safety/max-token handling
- abort behavior
- mobile watchdog behavior

**Desired owner:** runtime boundary established in Pass 32, implemented in Pass 40.

### Memory/context

The controller directly calls:

- `loadUserProfileNotes()`
- `loadActiveScratchpad()`
- `buildSystemPayload()`
- `runDirectMemoryExtraction()`
- `applyMemoryActions()`
- `setDbMemoryState()`

Memory therefore still enters Chat at both ends:

`context assembly → Chat → memory extraction → Chat state → persistence`

**Desired owner:** Memory/context services and commands. Chat should request context and emit/dispatch memory work, not know its persistence implementation.

### Google

The controller directly calls the legacy `getAccessToken()` from `googleApi.ts` and injects the resulting token into both direct and backend chat requests.

This is a major remaining boundary leak because Pass 29 established canonical Google authorization state, while the Chat controller still knows about the old provider-level token accessor.

**Desired owner:** canonical Google capability/runtime adapter. This should disappear in Pass 40/46–49.

### Workspace

The controller directly calls:

- `getWorkspace()`
- `saveWorkspace()`
- `saveAgentArtifact()`

It also interprets provider chunks containing workspace/artifact changes and persists those changes itself.

It separately converts generated canvases into Workspace artifacts during finalization.

**Desired owner:** Workspace command/service boundary. Physical removal is staged for Pass 42 and later Workspace rehabilitation.

### Background runtime

The controller knows the entire durable execution lifecycle:

- enabled/disabled check
- job creation
- persisted recovery record creation
- assistant-message background status update
- polling/waiting
- completion interpretation
- background record removal
- error semantics after acceptance

This duplicates responsibility that Pass 28/35 deliberately moved into the background runtime.

**Desired owner:** Background Runtime service/command boundary. Pass 42 is the primary extraction target.

### Thinking/stream presentation

The controller owns:

- thought parsing
- active thought sentence selection
- thought duration
- chunk aggregation
- canvas extraction
- `createStreamUiScheduler()` updates
- watchdog timers
- visibility-change handling

Some of this is legitimate Chat-level presentation orchestration. However, the provider-stream interpretation and thinking-state machinery should not be Chat-specific.

**Desired owner:** runtime/thinking adapter for provider events; Chat controller should receive normalized stream events.

### Persistence/rate limiting

The controller directly calls `incrementRateLimit()` and `setDbMemoryState()`.

The rate limiter is an application/runtime concern and should move behind the runtime contract. Direct DB memory persistence is a confirmed legacy leak and must disappear.

### Title generation

`generateConversationTitle()` is implemented directly in the Chat controller and contains two provider paths:

- direct Gemini client
- `/api/chat/title`

This is another runtime/provider concern hiding inside the feature controller.

**Desired owner:** conversation/title service. It should remain callable through the Chat contract but not know provider mechanics.

## Internal responsibilities currently mixed together

The controller currently combines at least these responsibilities:

1. assistant message lifecycle
2. conversation mutation
3. runtime selection
4. Gemini request construction
5. background job orchestration
6. direct Gemini streaming
7. backend SSE parsing
8. stream watchdog/recovery
9. visibility/lifecycle recovery
10. thought parsing
11. canvas parsing
12. Workspace persistence
13. artifact persistence
14. memory extraction
15. memory mutation
16. memory persistence
17. Google token acquisition
18. rate limiting
19. title generation
20. provider/error translation
21. final response projection

This is the principal remaining reason Chat is still a high-blast-radius subsystem.

## Responsibility classification

### Legitimate Chat ownership

These should remain in the Chat/application feature:

- initiating a user message lifecycle
- identifying the target conversation
- creating an assistant placeholder conceptually
- deciding how normalized runtime events map onto Chat UI state
- final message projection into the conversation
- user-facing Chat error state
- exposing `streamAssistantResponse()` to the Chat UI

### Must move out of Chat

These should not remain implemented inside the Chat feature:

- Gemini/provider execution
- SSE protocol parsing
- direct API-key/provider selection
- Google token retrieval
- background job persistence/recovery mechanics
- direct Workspace persistence
- direct DB memory persistence
- memory extraction implementation
- provider-specific title-generation mechanics
- runtime rate-limit implementation
- provider-specific chunk interpretation

### Transitional but bounded

These can remain temporarily while extraction occurs, but must not grow:

- thinking event parsing
- canvas extraction
- stream UI scheduler integration
- error-message normalization

## Target architecture for Passes 40–44

### Pass 40 — Runtime extraction

Target:

`Chat → ChatRuntime contract → Gemini/runtime implementation`

Chat supplies a normalized request and receives normalized stream events. No Gemini SDK/client, SSE parser, model/provider selection, or API-key branching remains in Chat.

### Pass 41 — Memory/tool boundary

Target:

`Chat → commands/contracts → Memory + Tools`

Chat no longer directly imports `memoryProcessor`, `db`, or provider tool implementation. Memory extraction becomes an owned memory operation, and tool activity arrives through normalized runtime events.

### Pass 42 — Workspace/background boundary

Target:

`Chat → Workspace commands/events`

`Chat → Background Runtime command`

Chat stops persisting Workspace state or background recovery records itself.

### Pass 43 — State minimization

Remove remaining Chat-local/transitional ownership of:

- runtime state
- memory state mirrors
- background lifecycle flags
- provider details
- duplicated artifact state

### Pass 44 — Chat shell collapse

The target hook should become a thin application controller whose primary responsibilities are:

- accept Chat intent
- invoke feature/runtime contracts
- translate normalized runtime events into message projections
- expose cancellation
- finalize conversation state

It should not know whether execution happened through direct Gemini, a backend, a background worker, Google, IndexedDB, or any particular tool implementation.

## Critical behavior that must survive extraction

The following are explicit regression requirements for Passes 40–44:

- direct API-key execution
- backend `/api/chat/stream` execution
- durable background execution
- abort/cancellation
- mobile/background watchdog behavior
- visibility recovery behavior
- streaming text accumulation
- thinking text and structured thought steps
- safety cutoff handling
- MAX_TOKENS handling
- canvas extraction
- artifact ID propagation
- generated canvas persistence
- memory extraction after assistant completion
- conversation title generation
- rate-limit accounting
- user-facing HTTP/429/503 errors
- durable-job no-fallback rule after acceptance
- canonical Google capability exposure rather than legacy token ownership

## Dependency risk ranking

### Critical — remove first

1. direct Gemini/provider execution
2. direct Google token access
3. direct background lifecycle ownership
4. direct Workspace persistence
5. direct memory persistence

### High

6. direct memory extraction
7. title generation provider mechanics
8. direct rate-limit mutation
9. raw SSE parsing

### Medium

10. thinking event parsing
11. canvas extraction
12. stream UI scheduling
13. error normalization

### Low / legitimate feature ownership

14. assistant-message projection
15. conversation lifecycle mutation
16. cancellation UI state

## Architectural invariant for future passes

**The Chat feature may orchestrate Chat behavior, but it must not become the implementation owner of another domain.**

A new runtime provider, memory backend, Google capability, background executor, or Workspace implementation must be replaceable without reopening `useChatStreamController.ts`.

## Pass 39 completion criterion

This inventory is considered complete only when future passes can use this document as the dependency/extraction checklist without rediscovering the current Chat architecture from scratch.

No production implementation changes are intentionally made by Pass 39 itself.
