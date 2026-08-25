# Pass 40 — Chat Runtime Extraction

## Objective

Move model/provider/background execution mechanics out of `useChatStreamController` without changing the Chat feature's externally visible behavior.

## What moved

`src/services/chatRuntimeService.ts` now owns the execution choice and transport details for all three existing Chat execution routes:

1. Durable background execution through `BackgroundRuntimeContract`.
2. Direct Gemini execution through `GeminiRuntimeContract` when a user API key is configured.
3. Backend `/api/chat/stream` SSE fallback when no local API key is configured.

Google credential lookup also remains behind the canonical Google contract rather than the legacy `googleApi` implementation.

## What remains deliberately in Chat

Pass 40 does **not** move:

- assistant-message creation and conversation mutation;
- stream UI scheduling;
- thinking/text/canvas interpretation;
- Workspace/artifact projection from runtime chunks;
- memory extraction and persistence;
- title generation;
- watchdog and page-visibility lifecycle handling;
- user-facing error presentation;
- rate-limit accounting.

Those responsibilities belong to Passes 41–44.

## Critical invariants

- Durable execution is never silently replaced by a second Gemini execution after the durable job has been accepted.
- Direct API-key execution preserves the existing model parameters, image/history payload, workspace context, Google credential, abort signal and chunk callback.
- Backend SSE execution preserves the existing endpoint, payload shape, streaming framing, error normalization and chunk semantics.
- Runtime failures continue to propagate to the Chat controller for existing user-facing error handling.
- `BLOCK_NONE` remains unchanged; this refactor does not alter Gemini safety policy.
- The legacy production repository remains untouched.

## Transitional dependency intentionally retained

Chat's background memory extraction still writes through `setDbMemoryState`. That is deliberately deferred to Pass 41 (Memory/tool boundary) so this pass changes only execution ownership and does not mix two architectural surgeries.

## Verification

CI production verification passed on the Pass 40 head before merge. The runtime boundary should remain covered by the repository-wide verification gate, with direct focused tests kept alongside the service as future execution branches are added or removed.
