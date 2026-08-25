# Pass 33 — Event / Command Boundaries

## Objective

Establish explicit cross-domain commands and events so major capabilities can communicate through stable application contracts instead of browser-global `CustomEvent` strings or tightly coupled direct notifications.

## Implemented

- Added `src/events/applicationEvents.ts` with a discriminated union of application facts:
  - `message.sent`
  - `memory.changed`
  - `artifact.changed`
  - `background.job.completed`
  - `google.authorization.changed`
- Added `src/events/applicationEventBus.ts` with typed subscription, publication, listener isolation, and deterministic unsubscribe semantics.
- Migrated artifact-created notifications in the Gemini/runtime and background paths onto the typed event bus.
- Migrated `ElaraSurfaces` from `window.addEventListener('elara:artifact-created', ...)` to the typed event subscription.
- Migrated canonical memory load/save operations to publish `memory.changed` events.
- Added `src/events/applicationCommands.ts` with typed command contracts and an asynchronous command-handler registry.
- Added regression tests covering event delivery/unsubscribe, subscriber isolation, and command registration/dispatch lifecycle.

## Architectural distinction

Commands are requests to perform state-changing work. Events are facts about work that has already occurred. Commands must have an explicit handler and fail loudly when no handler is registered. Events are best-effort notifications; one broken subscriber must not prevent other subscribers from observing the same fact.

The event bus is intentionally in-process and framework-independent. It is not a replacement for durable background messaging, a distributed queue, or React state management.

## Delivery semantics

Events currently provide **at-least-once observation semantics within the running page**, not exactly-once delivery. For example, a background status poll can observe an already-completed job more than once and therefore publish the completion fact more than once. Consumers must therefore be idempotent and must not treat an event as proof that they are the sole observer or owner of a state transition.

## Deliberate deferrals

`google.authorization.changed` is defined but the legacy OAuth provider remains the producer until the Google provider consolidation is completed. This avoids introducing a second authorization path during Pass 33.

`message.sent` is defined but the primary producer remains inside the chat controller until the chat/runtime extraction work gives message lifecycle ownership a stable command boundary. This avoids adding another notification side effect to the current orchestration hub.

## Invariants

- No new browser-global event names should be introduced for cross-domain application facts.
- New cross-domain notifications belong on the typed application event bus.
- Mutations that require an owner should enter through an explicit command/handler boundary rather than being broadcast as events.
- Event subscribers must remain observational; they must not become hidden owners of domain state.
- Durable work completion remains owned by the background runtime; the `background.job.completed` event only announces the completed fact.
- Event consumers must be safe under duplicate delivery.

## Future handoff

Pass 34 (plugin/tool architecture hardening) should use commands/events for tool-driven artifact and memory mutations where cross-feature orchestration currently relies on direct calls. Later chat and Google extraction passes should retire the two deferred producers above.
