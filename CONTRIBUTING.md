# Contributing to Elara Companion

Elara Companion is currently the architectural refactor repository. The legacy repository remains the production/reference system until the refactor is explicitly promoted.

## Where to start

`src/main.tsx` is the application composition entry point. `src/App.tsx` is the current shell and remains transitional.

Use these boundaries when locating or adding code:

- `src/app/` — application state and orchestration ownership
- `src/features/` — feature modules
- `src/contracts/` — stable feature-facing contracts and adapters
- `src/domain/` — domain concepts and rules
- `src/services/` — canonical application/service boundaries
- `src/infrastructure/` — concrete persistence/provider infrastructure
- `src/events/` — typed commands and lifecycle events
- `src/tools/` — tool/plugin capabilities and registration
- `src/components/` — React presentation components
- `src/lib/` — transitional legacy-heavy implementations; do not add new ownership here when a canonical boundary exists

## Normal workflow

Make one scoped architectural change at a time. Put it on a feature branch, run the relevant tests, inspect the diff, open the PR, and merge it only after the intended scope is verified.

The legacy repository must not be used as the place for refactor experiments. Compare against it when behaviour needs verification, but keep structural surgery in `Elara-Companion`.

## Verification

The supported test runner is Node's built-in test runner through the repository command:

```bash
npm test
```

Do not add a second test framework for convenience. Tests should use `node:test` and `node:assert/strict` unless a later architectural decision explicitly changes the test strategy.

The other primary checks are:

```bash
npm run lint
npm run build
npm run benchmark:memory
```

`npm run lint` includes lockbox validation/audit/secret scanning, TypeScript checking, and background-runtime typechecking. Do not bypass those checks with ad-hoc replacements.

## Boundary rules

Do not import directly from a sibling feature. Use a contract, service, domain API, or typed event/command when the interaction crosses a feature boundary.

Do not add new direct persistence/provider calls to React components when an established service boundary exists.

Tool capabilities must declare their capabilities/effects and must respect model-exposure and execution-authorization boundaries.

Automation state belongs to the automation runtime state machine, not React state or application domain state.

## Transitional code

Legacy implementations are being removed in controlled passes. Do not duplicate an old implementation under a new name merely to satisfy a boundary. When a legacy path is still required, document why it remains and identify the pass that owns its eventual removal.
