# Elara Companion v3

Elara is a React/Vite companion application with a persistent local Workspace, revision history, Gemini agent tooling, and optional Google Workspace integration.

## Architecture

The application has five main runtime areas:

- **UI / application shell** — `src/App.tsx` coordinates views and application state.
- **Chat runtime** — `src/lib/chatRuntime.ts` provides the shared Gemini context/configuration/tool-loop primitives used by the server and browser-direct paths.
- **Agent tools** — `src/lib/agentToolRegistry.ts` is the canonical combined Workspace + Google tool declaration/dispatch boundary.
- **Local Workspace** — `src/lib/workspaceTools.ts`, `revisionUtils.ts`, `syncUtils.ts`, and `workspaceStorage.ts` manage artifacts, revisions, comparison, restore, and persistence.
- **Google integration** — `src/lib/googleAgentTools.ts`, `googleAgentOperationalTools.ts`, `googleApi.ts`, and the Google authorization/runtime helpers provide external Workspace access.

## Persistence

IndexedDB is used for durable application stores such as conversations and settings. Browser `localStorage` is used for runtime/profile/workspace compatibility stores. Persistence ownership and migration logic is centralized in `db.ts` and the Workspace storage helpers.

## Agent safety

Google reads and external writes are separated at the agent registry. External write/destructive operations require explicit `userConfirmed: true` before dispatch. Google authentication failures invalidate the current runtime session, and Google disconnect/revoke is exposed as an explicit authenticated operation.

## Development

```bash
npm install
npm run dev
```

The production checks used by CI are:

```bash
npm run lint
npm test
npm run build
```

CI runs with Node 24 and uses `actions/checkout@v6` plus `actions/setup-node@v6`.

## Deployment

The frontend is Vite-based and can run directly in the browser. The Express server is bundled to `dist/server.cjs` by the production build. Browser-direct Gemini execution is retained for static hosting environments where the server runtime is not available.

## Stabilization status

V3 has completed the five-pass stabilization program covering build/type correctness, persistence and Workspace integrity, canonical chat runtime consolidation, Google authorization/action safety, and final repository cleanup.
