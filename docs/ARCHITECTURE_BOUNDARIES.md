# Elara Architectural Refactor Boundaries

This document defines the target boundaries for the long-horizon architectural rehabilitation of Elara. It is scaffolding only: Pass 2 does not move or rewrite existing runtime code.

## Principles

1. One authoritative implementation per responsibility.
2. UI components render and coordinate user interaction; they do not own infrastructure protocols.
3. Domain modules own business rules and domain state transitions.
4. Services expose stable application capabilities without leaking transport or storage details.
5. Infrastructure owns persistence, browser APIs, network transports, external providers, and platform-specific concerns.
6. Runtime modules own execution concerns such as model calls, streaming, retries, cancellation, and tool loops.
7. Dependencies should point inward toward stable contracts; low-level infrastructure must not become the application's policy layer.
8. Refactor passes preserve behaviour unless a pass explicitly declares a behavioural change.
9. Legacy code is removed only after the replacement path is verified.

## Target top-level structure

```text
src/
  app/             Application composition, lifecycle, and top-level orchestration
  features/        User-facing capability slices (chat, settings, workspace, memory, voice, etc.)
  domain/          Stable domain models, policies, and pure business rules
  services/        Application-facing capability services and use-case boundaries
  infrastructure/  Persistence, browser/platform APIs, external providers, and transport adapters
  runtime/         AI execution, streaming, background execution, and other runtime machinery
  components/      Presentational/shared React components
  hooks/           Shared React hooks that remain genuinely presentation/application oriented
  constants/       Stable application constants
  lib/             Existing implementation library; migrated incrementally, not wholesale
```

## Current-to-target migration rule

`src/lib/` and the existing component tree remain valid during the rehabilitation. They are not treated as failures merely because the target structure exists. Each later pass moves a coherent responsibility into its target boundary, verifies it, and then removes or demotes the old path.

No pass should create a second authoritative implementation merely to make the new folders look complete.

## Intended ownership

### `app/`

Owns application composition and lifecycle only. It may depend on features, services, runtime contracts, and infrastructure bootstrap. It should not contain provider-specific business logic.

### `features/`

Owns user-facing capability orchestration. A feature may compose UI, domain rules, and application services, but should not directly implement low-level persistence or external-provider protocols.

### `domain/`

Owns stable types, invariants, policies, selectors, and pure business rules. Domain code should be as framework-independent as practical.

### `services/`

Owns application use cases and capability boundaries such as conversation management, memory operations, Workspace operations, settings, and integrations. Services may depend on domain contracts and infrastructure adapters.

### `infrastructure/`

Owns IndexedDB/local persistence adapters, browser APIs, network/API clients, OAuth transport, and other external/platform details. Infrastructure should expose explicit interfaces to higher layers.

### `runtime/`

Owns execution lifecycles: Gemini/model calls, streaming, retries, cancellation, tool loops, background execution, and related runtime resilience.

### `components/`

Owns reusable presentational React components. Components should receive data and callbacks rather than directly discovering or mutating infrastructure state.

## Extraction order

The first monolith extraction sequence is intentionally conservative:

1. Persistence and hydration boundary.
2. Conversation/folder lifecycle.
3. Chat message lifecycle.
4. Chat execution/streaming controller.
5. Background runtime lifecycle.
6. Workspace/artifact coordination.
7. Settings/theme coordination.
8. Final application-shell reduction.

## Pass 2 constraint

At the end of Pass 2, the application must still use its existing runtime paths. This pass establishes names, ownership rules, and documentation only. Behaviour-preserving extraction begins in Pass 3.
