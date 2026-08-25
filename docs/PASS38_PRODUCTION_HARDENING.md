# Pass 38 — Production Hardening

## Objective

Prove the refactored repository as a coherent system before stabilization: typecheck, tests, build, memory benchmark, migration/recovery coverage, runtime/startup paths, background execution, capability exposure, and failure boundaries.

## Hardening audit

### Build and verification pipeline

The canonical local and CI production gate is `npm run verify:production`.

It runs, in order:

1. `npm run lockbox:verify`
2. `npm run lint`
3. `npm test`
4. `npm run benchmark:memory`
5. `npm run build`

`npm run lint` includes Lockbox validation, Lockbox audit, secret scanning, TypeScript checking, and background-runtime typechecking. The CI workflow invokes the same production gate rather than maintaining a separate verification sequence.

### State and migration safety

Persistence/reload, normalization, malformed-state handling, memory authority, and background recovery are covered by the state-consistency suites established in Pass 30 and the persistence tests already present in the repository. There is no separate migration runner; migrations are exercised through the canonical persistence/controller paths and recovery tests.

The IndexedDB migration marker is only written after all configured legacy migrations succeed, so recoverable partial migration failures remain retryable rather than becoming permanent completion state.

### Background runtime

Pass 28 and Pass 35 established and tested independent background job identity, CAS-based claiming, stale-claim recovery, idempotent execution, and non-regressive state transitions.

### Tool and capability exposure

Pass 34–36 establish typed tool contracts, plugin ownership, capability/effect metadata, model-facing exposure filtering, and a separate execution-authorization gate. Automation is deliberately prevented from receiving external-write/auth tool visibility.

### Environment and Lockbox hardening

Server runtime-mode inspection flows through the server Lockbox adapter rather than direct `process.env` access. Vite configuration reads build environment through Vite's `loadEnv` mechanism. The remaining direct environment read is confined to the legacy `src/lib/googleApi.ts` provider; its exception is explicit in `scripts/lockbox-audit.mjs` and is owned by the already-documented Google provider purge. This is transitional debt, not a new architectural pattern.

The previously unused tracked Firebase applet configuration artifact has been removed after repository-wide reference checking found no active consumer.

### Portrait / model-context boundary

The persisted `customPortrait` application state is not automatically injected into Gemini request contents. Images reach the model through explicit chat-history/current-message image inputs. Pass 36 regression coverage protects that boundary.

### Runtime/Chat integrity

The production-hardening review explicitly rejected an incomplete Chat-controller extraction that left the active stream controller as an unreachable stub. The verified complete controller implementation was restored before hardening changes were finalized. No production candidate may proceed with an incomplete orchestration replacement merely because the surrounding contracts compile.

## Known pre-production conditions

The refactor repository is not yet the production repository. `cryogenized-spec/Elara-companion-app-v2` remains the production/reference baseline. This repository becomes a production candidate only after stabilization and final comparison against that baseline.

The legacy Google provider (`src/lib/googleApi.ts`), large `src/lib` transitional surface, and remaining `App.tsx` orchestration are still bounded architectural debt. They are not silently reclassified as canonical.

Live-provider verification remains separate from repository CI: Google OAuth, Cloudflare worker secrets/bindings, external API quotas, and real background-worker deployment require the configured provider environment and therefore cannot be proven from repository-only checks.

## Hardening result

The repository is ready to enter stabilization **only after the final Pass 38 CI run is green and the live-provider/manual verification items are explicitly checked**. Any CI failure must be classified as either:

- introduced by the refactor/hardening work and fixed before promotion, or
- a pre-existing repository/infrastructure failure explicitly documented and resolved before production transition.
