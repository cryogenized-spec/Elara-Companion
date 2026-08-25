# Pass 38 — Production Hardening

## Objective

Prove the refactored repository as a coherent system before stabilization: typecheck, tests, build, memory benchmark, migration/recovery coverage, runtime/startup paths, background execution, capability exposure, and failure boundaries.

## Hardening audit

### Build and verification pipeline

The canonical CI pipeline runs, in order:

1. `npm run lint`
2. `npm test`
3. `npm run benchmark:memory`
4. `npm run build`

`npm run lint` includes Lockbox validation, Lockbox audit, secret scanning, TypeScript checking, and background-runtime typechecking. No alternate verification pipeline was introduced.

### State and migration safety

Persistence/reload, normalization, malformed-state handling, memory authority, and background recovery are covered by the state-consistency suites established in Pass 30 and the persistence tests already present in the repository. There is no separate migration runner; migrations are exercised through the canonical persistence/controller paths and recovery tests.

### Background runtime

Pass 28 and Pass 35 established and tested independent background job identity, CAS-based claiming, stale-claim recovery, idempotent execution, and non-regressive state transitions.

### Tool and capability exposure

Pass 34–36 establish typed tool contracts, plugin ownership, capability/effect metadata, model-facing exposure filtering, and a separate execution-authorization gate. Automation is deliberately prevented from receiving external-write/auth tool visibility.

### Environment and Lockbox hardening

Server runtime-mode inspection now flows through the server Lockbox adapter rather than direct `process.env` access. Vite configuration reads build environment through Vite's `loadEnv` mechanism. The remaining direct environment read is confined to the legacy `src/lib/googleApi.ts` provider; its exception is explicit in `scripts/lockbox-audit.mjs` and is owned by the already-documented Google provider purge. This is transitional debt, not a new architectural pattern.

### Portrait / model-context boundary

The persisted `customPortrait` application state is not automatically injected into Gemini request contents. Images reach the model through explicit chat-history/current-message image inputs. Pass 36 regression coverage protects that boundary.

## Known pre-production conditions

The refactor repository is not yet the production repository. `cryogenized-spec/Elara-companion-app-v2` remains the production/reference baseline. This repository becomes a production candidate only after stabilization and final comparison against that baseline.

The legacy Google provider (`src/lib/googleApi.ts`), large `src/lib` transitional surface, and remaining `App.tsx` orchestration are still bounded architectural debt. They are not silently reclassified as canonical.

## Hardening result

The repository is structurally ready for the stabilization phase, subject to the actual CI run on this pass. Any CI failure must be classified as either:

- introduced by the refactor/hardening work and fixed before promotion, or
- a pre-existing repository/infrastructure failure explicitly documented and resolved before production transition.
