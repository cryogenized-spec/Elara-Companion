# Elara Canonical Architecture

Status: locked at Pass 17 of the Architectural Rehabilitation Programme.

This document is the current architectural source of truth for the successor repository. It records the boundaries that have actually been established, rather than describing a future scaffold. Future work must extend these canonical paths instead of introducing parallel implementations.

## Core rule

One authoritative implementation per responsibility.

Compatibility code is permitted only when it protects persisted data, migrations, external contracts, or a verified recovery path. A legacy implementation must not remain merely because it is familiar or because an earlier provider generated it.

The legacy repository `cryogenized-spec/Elara-companion-app-v2` remains the historical/recovery reference. It is not an implementation source for new features.

## Layer model locked by Pass 16

Pass 16 establishes the dependency model that future extraction work must follow. It describes ownership and allowed dependency direction; it does not require every existing file to have already moved into its eventual directory.

```text
                 React/UI surfaces
                        |
                        v
            Feature/application orchestration
                        |
                        v
                 Domain contracts
                        |
                        v
                    Services
                   /        \
                  v          v
        Infrastructure     Runtime
        / persistence      / model execution
        / external APIs    / streaming
        / browser APIs     / background jobs
```

The preferred direction is from higher-level policy toward stable lower-level capabilities. UI components and feature controllers must not become infrastructure owners. Domain code must remain independent of React and provider-specific APIs. Services expose application capabilities without leaking storage, transport, OAuth, or model-provider mechanics. Infrastructure owns external and platform details. Runtime owns execution lifecycle and resilience rather than user-facing policy.

### UI / presentation

UI components render state and coordinate direct user interaction. They may call feature/application callbacks and display service results, but they should not directly perform IndexedDB persistence, OAuth flows, raw HTTP protocol handling, Gemini streaming, background job polling, or low-level browser lifecycle management.

Presentational components may contain local interaction state such as modal visibility, input composition, visual selection, and animation state. Such state must not become an accidental second source of truth for domain or persisted application state.

### Feature / application orchestration

Feature modules own user-facing capability workflows: conversation lifecycle, chat commands, settings coordination, Workspace workflows, memory-facing actions, voice configuration, and similar application use cases.

A feature controller may coordinate several services and domain rules. It may translate UI intent into application commands. It should not implement the persistence protocol, provider SDK details, raw fetch/SSE parsing, OAuth transport, or durable background execution itself.

`App.tsx` remains the composition shell. It may assemble feature controllers and pass state/callbacks between views, but new feature mechanics should not be placed back into it merely for convenience.

### Domain

Domain modules own stable concepts, invariants, policies, transformations, selectors, validation and other rules that can be expressed without React or external-provider mechanics.

Domain code should not import IndexedDB adapters, `window`, `document`, Gemini clients, Google OAuth helpers, Express handlers, or other infrastructure/runtime implementation details.

When a rule is reusable, deterministic and meaningful independent of a particular UI or transport, it belongs at this layer rather than inside a React component or provider adapter.

### Services

Services define application-facing capabilities and use-case boundaries. Examples include conversation operations, memory operations, Workspace/artifact operations, settings operations, Google capability operations, and persistence-facing application stores once those boundaries are extracted.

A service may orchestrate domain rules plus infrastructure/runtime dependencies. Its public contract should describe what Elara needs done rather than how a provider or storage engine happens to do it.

Services should be the preferred seam for cross-feature reuse. A feature should depend on a stable service capability instead of importing another feature's internals merely to reach shared infrastructure.

The canonical Google application facade is `src/services/googleWorkspaceService.ts`. Google UI surfaces use this service boundary for identity and capability authorization. The underlying `src/lib/googleAuthorization.ts`, `src/lib/googleCapabilityPolicy.ts`, and `src/lib/googleApi.ts` remain infrastructure/provider implementations during incremental migration.

### Infrastructure

Infrastructure owns platform and external details: IndexedDB and other persistence adapters, browser APIs, local storage projections, network clients, OAuth transport, Google API transport, HTTP adapters, and environment-specific mechanisms.

Infrastructure may depend on external SDKs and platform APIs. It must not become the place where product policy or UI behaviour is decided.

The existing `src/lib/db.ts` persistence layer is therefore infrastructure even while it remains in `src/lib/` during incremental migration. Directory placement does not override architectural ownership.

### Runtime

Runtime owns execution lifecycle rather than product policy: Gemini/model invocation, streaming, retries, cancellation, model health/fallback state, tool loops, durable background execution, recovery and related resilience concerns.

The runtime may depend on infrastructure adapters and domain/service contracts. UI and feature code should request execution through stable runtime/service interfaces rather than parse provider streams or manage retry machinery themselves.

`src/lib/chatRuntime.ts`, the browser-direct Gemini client, and the dedicated background runtime are transitional physical locations for runtime ownership until later extraction passes move them behind the intended boundary.

## Transitional reality

Pass 16 deliberately does not move files simply to satisfy the diagram. The current codebase contains transitional coupling, including feature controllers that still import `src/lib/*`, and `App.tsx` still performs a small amount of direct persistence/browser coordination. Those are known extraction targets for later passes.

Pass 17 reduces Google coupling by routing the canonical Google settings UI through `src/services/googleWorkspaceService.ts` and removing the superseded, unreferenced `GoogleWorkspaceSettingsPanel` implementation. The underlying provider modules remain transitional infrastructure until later service/infrastructure extraction work.

The architectural rule is therefore:

**Do not deepen the coupling. Future work must reduce it.**

When a later pass extracts a responsibility, it should move toward the layer model above rather than creating a new abstraction that points sideways at another feature or directly at provider internals.

## Dependency rules

Allowed direction:

- UI -> feature/application orchestration
- Feature/application -> domain, services, approved runtime contracts
- Services -> domain, infrastructure adapters, runtime contracts
- Infrastructure -> platform/external providers
- Runtime -> domain/services plus infrastructure adapters required for execution

Discouraged or prohibited direction:

- UI -> raw persistence or provider protocol
- UI -> another feature's internal implementation
- Domain -> React, browser APIs, providers, persistence or runtime implementation
- Infrastructure -> UI or feature policy
- Runtime -> presentation components
- One feature -> another feature's private controller internals when a service/domain contract should exist

These are architectural constraints, not a demand for immediate wholesale reorganization. Violations encountered in existing code become extraction targets and should not be multiplied.

## Canonical ownership carried forward

Conversation lifecycle is owned by `src/features/conversations/useConversationController.ts`.

Chat execution and response streaming are owned by the chat feature controllers, with execution behind the runtime boundary.

Workspace navigation/orchestration is owned by `src/features/workspace/useWorkspaceController.ts` and the Workspace services/storage it invokes.

Settings coordination is owned by `src/features/settings/useSettingsController.ts`. Settings UI is composed through the canonical settings surfaces, including `VoiceChatSettingsPanel` and its Voice Input, Chat & Editor, and Reliability children.

Background lifecycle is owned by `src/runtime/useBackgroundRuntimeController.ts` and the dedicated background runtime.

IndexedDB application persistence is canonicalized through `src/lib/db.ts` and the application state controller.

`src/components/ChatMessage.tsx` is the canonical chat-message entry component.

Markdown rendering is unified through the canonical message renderer path.

Structured IndexedDB memory is authoritative; Scratchpad and similar views are derived projections.

Google capability declarations and authenticated operations are centralized through `src/services/googleWorkspaceService.ts`, which is the application-facing boundary over the underlying Google authorization, capability-policy, and API infrastructure.

## What is prohibited

Do not add a parallel Settings implementation.

Do not add a second chat message renderer or Markdown renderer.

Do not add direct feature-level persistence writes where the application persistence boundary already owns synchronization.

Do not introduce a second Gemini/model execution path without an explicit architectural decision.

Do not make React components responsible for raw OAuth, HTTP streaming, IndexedDB transactions, or durable background polling.

Do not introduce feature-to-feature dependencies when a domain or service contract is the appropriate shared boundary.

Do not resurrect deleted migration workflows, pass trigger files, or one-shot source-rewrite machinery.

Do not copy legacy repository implementations into the successor repository merely because they already exist there.

Do not reintroduce the superseded `GoogleWorkspaceSettingsPanel`; the canonical Google UI is `GoogleCapabilitySettingsPanel` through the Google service boundary.

## Change rule for future passes

Every architectural pass should answer three questions before changing code:

1. Which existing implementation is canonical?
2. What responsibility is being moved, removed, or isolated?
3. What previously competing path must remain absent after the change?

For passes in Programme 3 and later, also answer:

4. Which layer owns the responsibility after this change?
5. Does the dependency direction become simpler or more explicit?
6. What coupling remains deliberately transitional, and which later pass owns its removal?

A pass is incomplete if it leaves the application with two plausible owners for the same responsibility or deepens an existing cross-layer dependency without an explicit architectural reason.
