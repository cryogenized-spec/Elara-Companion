# Pass 35 — Automation Architecture Hardening

## Objective

Make scheduled/background automation a self-contained execution subsystem that can add new job types without reopening the Chat UI or duplicating runtime behavior.

## Findings

The existing automation system already had useful pieces: a five-minute dispatcher workflow, a separate executor workflow, retry settings, GitHub Actions concurrency, private state in `runtime.json`, and a dedicated Lockbox boundary. The important weakness was the shared runtime state transition between dispatcher and executor.

Before this pass, the dispatcher checked whether an execution had already been accepted and then launched the executor before persisting the `dispatched` state. A crash between those two operations could cause the next dispatcher run to launch the same execution again. The executor also had no explicit idempotency gate before entering the Gemini/tool loop.

## Implemented

- Added `scripts/automation-runtime.mjs` as the framework-independent state-machine helper layer.
- Added stable execution-key generation.
- Added explicit terminal/active status classification.
- Added dispatch and execution lease checks.
- Added atomic dispatch claims using the GitHub Contents API SHA as the compare-and-swap boundary.
- Dispatcher now refreshes `runtime.json` before every candidate claim so multiple automations in one run do not reuse a stale SHA.
- Dispatcher records job and schedule advancement from freshly-read state after dispatch.
- Executor now checks the existing execution state before starting and refuses duplicate terminal/active executions.
- Executor claims `running` state through the same compare-and-swap mechanism and retries once after a state conflict.
- Expanded `automation-state/schema.json` to formally describe runtime job statuses, worker/claim metadata and per-automation schedule state.
- Added `scripts/automation-runtime.test.mjs` covering claim freshness, stale recovery, terminal idempotency and executor start rules.

## State machine

Normal path:

`scheduled → dispatching → dispatched → running → success`

Failure paths:

`dispatching → dispatch_failed`

`running → failed`

A stale `dispatching` or `running` record may be reclaimed only according to the lease rules in `automation-runtime.mjs`.

## Architectural invariants

- `executionKey` is the identity of one logical scheduled execution.
- A dispatcher must claim before dispatching.
- A state SHA conflict means another writer won; it is not permission to dispatch anyway.
- The executor must be idempotent for a given `executionKey`.
- Background scheduling remains independent of React and Chat UI state.
- `runtime.json` is operational state, not application/domain state.
- GitHub Actions provides worker orchestration; the runtime state machine remains the source of truth for logical execution identity and lifecycle.

## Deliberate non-goals

This pass does not migrate the automation executor away from `chatRuntime.ts` yet. That coupling is now explicitly bounded and belongs to the later runtime/developer-ergonomics hardening work. Likewise, automation-specific tool permissions remain governed by the existing tool authorization architecture.

## Future handoff

Pass 36 should build testing around these execution boundaries rather than testing only the UI. In particular, recovery after worker failure, stale lease reclaim, state-write conflicts, retry semantics, and exactly-once logical execution should become regression scenarios.
