# Pre-feature readiness audit

This document records the final hardening posture before new feature development.

## Green architectural areas

- One canonical browser-side Google authorization authority.
- Google provider façade is compatibility-only.
- Local Keep archive implementation is physically removed.
- Settings persistence is service-owned.
- Workspace application mutations and persistence are separated.
- Background reconciliation uses the Workspace persistence boundary.
- OOC execution is service-owned and explicitly tool-free.
- Context assembly is owned by `chatContextService`; `contextManager` is transitional compatibility only.
- UI architecture locks reject direct Workspace storage and provider bypasses.
- Lockbox audits restrict direct environment access to approved adapters.
- Production verification covers lockbox, lint/typecheck, tests, memory benchmark, build, and bundle budget.

## Hardening completed in this final tranche

- Production Express routes now fail closed without `ELARA_SERVER_ACCESS_TOKEN`.
- Production CORS is exact-origin allow-list based on `ELARA_ALLOWED_ORIGINS`; wildcard CORS is not used.
- Local development retains localhost access without the production bearer credential.
- Server Chat/Memory/Audio routes consume the server-owned runtime adapter instead of importing the transitional Gemini runtime modules directly.
- Mermaid is lazy-loaded so its dependency is not eagerly imported by the Markdown renderer.
- A bundle-size budget is enforced after production build.
- npm is the authoritative package manager and Node 24 is pinned in the package-manager metadata.
- Root and `background-runtime` npm lockfiles are tracked.
- CI and deployment workflows use `npm ci` rather than floating `npm install` resolution.
- The competing Bun lockfile was removed.

## Remaining deployment configuration, not application architecture

### GitHub Pages
The static Vite build succeeds. The current GitHub Pages workflow previously failed at `actions/configure-pages` with `Resource not accessible by integration` before artifact upload. This requires repository-level Pages configuration/permissions to be corrected in GitHub; it is not a frontend build failure.

### Express backend
The Express runtime is intentionally not an anonymous public API. Public backend operation requires the server access token and exact trusted origins. Do not embed `ELARA_SERVER_ACCESS_TOKEN` in browser code. The public static deployment remains safe through browser-direct execution until a proper end-user authenticated backend mode exists.

## Transitional runtime code

`src/lib/chatRuntime.ts` and `src/lib/resilientGeminiStream.ts` remain implementation modules used beneath the server runtime adapter. They are transitional, not canonical feature entry points. New feature code must not import them directly. A later runtime extraction may move their implementation physically into `src/runtime` without changing feature contracts.

## Feature-development gate

New feature work may begin when the final hardening branch has a green `npm ci` + production verification run and the intended deployment configuration is selected.

For every new feature:

`requirement -> owning feature/domain -> stable service/contract -> infrastructure adapter -> UI composition`

Never add new feature ownership to `src/lib` when an established canonical boundary already exists. Never bypass the service/persistence/runtime/tool contracts merely because a lower-level helper is convenient.
