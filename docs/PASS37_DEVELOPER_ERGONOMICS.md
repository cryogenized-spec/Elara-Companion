# Pass 37 — Developer Ergonomics

## Objective

Make the refactor repository easier to understand and modify without an archaeological expedition. The architecture should have discoverable entry points, one test runner, predictable ownership, and durable navigation guidance.

## Findings

The repository now has the intended architectural directories (`app`, `contracts`, `domain`, `events`, `features`, `infrastructure`, `tools`) alongside a still-large `src/lib` transitional surface. This is expected at this stage and is recorded as migration debt rather than hidden behind renames.

`src/main.tsx` is the application entry point and explicitly composes the root shell plus independently mounted cross-cutting surfaces. `package.json` defines the supported development, build, verification, and test commands.

A concrete tooling mismatch was found: the project test command is `node --import tsx --test`, while two architectural test files imported `vitest`, which is not a project dependency. That created two implicit test runners and meant the architecture tests were not aligned with the repository's actual verification command.

## Implemented

- Standardized the two architectural test files on `node:test` and `node:assert/strict`.
- Kept the existing project-wide `npm test` command as the single supported test entry point.
- Added this document as the current developer navigation record rather than creating another competing setup system.
- Recorded the transitional `src/lib` surface as an explicit migration area for later passes.

## Developer navigation

Start here:

1. `src/main.tsx` — application composition / runtime entry point.
2. `src/App.tsx` — current application shell; still transitional and not yet the final thin shell.
3. `src/app/` — application-state ownership and controllers.
4. `src/features/` — feature boundaries; sibling feature imports are prohibited by test.
5. `src/contracts/` — feature-facing contracts and service adapters.
6. `src/services/` — canonical application/service boundaries.
7. `src/domain/` — domain logic and shared domain structures.
8. `src/infrastructure/` — implementation-facing infrastructure.
9. `src/events/` — typed application events/commands.
10. `src/tools/` — capability/tool plugin architecture.
11. `src/lib/` — transitional legacy-heavy surface; do not expand it with new feature ownership when a canonical boundary already exists.

## Verification commands

- `npm run build` — production bundle build.
- `npm test` — repository test suite using Node's built-in test runner with tsx.
- `npm run lint` — lockbox checks, TypeScript check, and background-runtime typecheck.
- `npm run benchmark:memory` — memory consolidation benchmark.

The lockbox checks are intentionally part of the normal lint command and must not be bypassed by introducing ad-hoc verification commands.

## Architectural ergonomics rules

- New feature code belongs in a canonical feature/service/domain boundary, not in `src/lib` simply because a nearby legacy helper exists.
- New tests should use the repository's existing test runner unless a later pass explicitly establishes a second runner for a justified reason.
- Public cross-feature APIs belong in `src/contracts`, typed lifecycle notifications belong in `src/events`, and capability registration belongs in `src/tools`.
- Transitional code stays explicitly documented until its owning extraction pass removes it; do not create duplicate "new" and "old" versions under different names.

## Remaining ergonomic debt

The most important remaining burden is the size and heterogeneity of `src/lib`, especially the chat/runtime, Google, Workspace, storage, and compatibility implementations. This pass does not physically purge those files because later passes own the corresponding extraction and legacy-removal work.

`App.tsx` remains a transitional application shell and is still too knowledgeable to be considered the final ergonomic endpoint. The later architecture/hardening work must continue reducing that surface rather than merely documenting it.
