# Elara Companion v3

Elara is a React/Vite personal companion application built around a Gemini-backed chat runtime, a persistent local Workspace, durable conversation recovery, structured long-term memory, revision history, agent tooling, and optional Google Workspace integration.

This repository is the canonical application codebase. The current architecture favors one authoritative implementation per responsibility: one chat runtime, one Markdown renderer, one structured memory store, one retrieval path, and unified settings rather than parallel legacy controls.

## Core architecture

The application is organized around these runtime domains:

- **Application shell** — `src/App.tsx` coordinates views, conversation state, settings, persistence, and feature integration.
- **Chat runtime** — `src/lib/chatRuntime.ts` provides the shared Gemini model/context/tool-loop primitives used by the server and browser-direct paths.
- **Context assembly** — `src/lib/contextManager.ts` builds the system payload, including the stable profile and query-specific retrieved memory context.
- **Canonical Markdown rendering** — chat messages use the unified renderer rather than separate user/assistant Markdown implementations.
- **Agent tools** — `src/lib/agentToolRegistry.ts` is the canonical combined Workspace + Google tool declaration/dispatch boundary.
- **Local Workspace** — Workspace storage, artifacts, revisions, comparison, restore, and synchronization live in the Workspace/revision helpers under `src/lib/`.
- **Google integration** — Google agent/API helpers provide authenticated external Workspace access with explicit write confirmation.
- **Memory** — the structured IndexedDB memory state is authoritative; the visible Scratchpad is a derived inspection/projection surface.

## Memory architecture

Elara's memory system is intentionally layered rather than being a single prompt-sized notebook. See [`docs/ELARA_MEMORY_ARCHITECTURE.md`](docs/ELARA_MEMORY_ARCHITECTURE.md) for the full contract.

The memory pipeline is:

```text
conversation
    -> observation extraction
    -> structured memory store
    -> duplicate/conflict consolidation
    -> promotion and lifecycle maintenance
    -> contextual retrieval
    -> bounded Gemini context
```

Memory is represented at several resolutions: `core`, `contextual`, `episodic`, `observation`, and `synthesized`. Lifecycle state separately tracks whether a record is `active`, `stale`, `archived`, `superseded`, or `conflicted`.

The memory store keeps provenance, evidence, reinforcement, retrieval history, relationships, and supersession information. Retrieval is deterministic and bounded so growing memory cannot cause unbounded prompt expansion. Maintenance runs at the persistence boundary and ages or archives records without destroying useful history.

The Scratchpad is the human-facing memory inspection surface. Its Insights view is read-only and explains why a memory exists, its resolution/state, confidence, importance, evidence, provenance, freshness, and relationships. Structured memory remains the single source of truth.

## Chat, Markdown, and recovery

Elara uses one canonical Markdown renderer across user and assistant messages. Lightweight structures such as tables, lists, checklists, quotes, emphasis, links, code blocks, and short formatted notes can remain directly in chat; larger persistent/editable work belongs in the Workspace/artifact layer.

The chat composer has durable per-conversation drafts. Drafts are persisted locally and can be recovered after reload, backgrounding, app termination, or other lifecycle interruptions.

Outgoing messages also use a local recovery/outbox layer with client-side identity and server-side idempotency protection. Recently sent/recoverable text can be restored or copied from the Chat & Editor settings without adding controls over the typing surface. The recovery layer is intentionally silent unless something actually needs recovery.

Mobile viewport handling includes explicit resume/IME re-synchronization so returning to Elara with the Android keyboard already open does not leave the editor underneath the keyboard.

## AI and model runtime

AI calls are centralized through the Gemini runtime contract. Model selection, reliability/retry behavior, temporary model health, fallback ordering, and restoration policy are handled by the existing resilience layer rather than separate ad-hoc callers.

The runtime supports both server-backed execution and browser-direct execution for static-hosting environments. Production behavior is validated through the same TypeScript, test, and build gates used by CI.

## Persistence

IndexedDB is the durable application store for conversations, settings, and structured memory. `src/lib/db.ts` is the main persistence/migration boundary and normalizes persisted data before exposing it to the application.

Browser `localStorage` remains for derived/runtime compatibility projections such as profile/context mirrors where appropriate. These projections are not authoritative over the structured stores.

Memory schema changes are additive and migration-safe. The current structured memory schema is version 3.

## Agent safety

Google read and write operations are separated at the agent registry. External writes and destructive actions require explicit confirmation before dispatch. Authentication failures invalidate the runtime session appropriately, and disconnect/revoke operations are explicit authenticated actions.

## Development

Install dependencies:

```bash
npm install
```

Run the development application:

```bash
npm run dev
```

Run the production checks used by CI:

```bash
npm run lint
npm test
npm run build
```

`npm run lint` performs TypeScript checks for the main application and background runtime. `npm test` uses Node's built-in test runner through `tsx`. `npm run build` produces the Vite frontend and bundles the Express server to `dist/server.cjs`.

CI currently runs on Node 24 and validates Typecheck, Unit tests, and Build before merge.

## Deployment

The frontend is Vite-based and can run directly in the browser. The production server is bundled to `dist/server.cjs`. Browser-direct Gemini execution remains available for static-hosting environments where an Express runtime is not available.

## Repository conventions

Keep one authoritative implementation for each subsystem. Prefer extending the existing persistence/runtime/settings boundary over introducing parallel compatibility layers. New UI controls should live in the existing unified settings or feature surface rather than floating independently over the chat/editor.

When changing memory behavior, update the memory architecture contract and regression coverage together. When changing chat behavior, preserve the canonical renderer, context assembly, recovery, and mobile viewport boundaries rather than introducing duplicate paths.

## Architecture status

The memory architecture program is complete through Pass 8: schema foundation, observation stream, consolidation/promotion, retrieval, Gemini context integration, maintenance/decay, transparency/inspection, and final hardening/regression are implemented.

The repository is now in the post-memory-architecture state. Future work should build on these consolidated boundaries rather than reintroducing legacy parallel implementations.
