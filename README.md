# Elara Companion v3

Elara is a React/Vite personal companion application built around a Gemini-backed chat runtime, durable conversations, a persistent local Workspace, structured long-term memory, revision history, agent tooling, optional Google Workspace integration, background execution, and recovery-aware application state.

This repository is the canonical refactor/production successor. The historical repository `cryogenized-spec/Elara-companion-app-v2` remains the protected reference and is not used for new development.

## Architectural status

The repository has completed the architectural rehabilitation and final hardening programme. The current codebase follows one authoritative implementation per responsibility and uses explicit application/service boundaries to keep UI, domain orchestration, provider/runtime code, and persistence from collapsing back into one another.

The important canonical boundaries are:

- Application shell: `src/App.tsx` composes the application and views; it should not become the owner of subsystem mechanics again.
- Conversation/application state: owns conversation lifecycle and persistence-facing message state.
- Chat runtime: provider execution is requested through the Gemini runtime contract and application runtime services.
- Gemini runtime configuration: `src/runtime/geminiRuntimeConfigService.ts` owns model/tool configuration policy.
- Gemini execution: `src/runtime/geminiRuntimeService.ts` is the application-facing execution boundary; lower-level provider/client files remain implementation details.
- Context assembly: `src/services/chatContextService.ts` owns system-payload assembly, memory retrieval context, and retrieval traces. `src/lib/contextManager.ts` is compatibility-only.
- OOC: `src/services/oocConversationService.ts` owns OOC execution and explicitly disables tools through the runtime contract.
- Workspace application operations: `src/services/workspaceService.ts`.
- Workspace persistence: `src/services/workspacePersistenceService.ts`, backed by the existing storage implementation.
- Workspace/background reconciliation: `src/services/workspaceBackgroundService.ts`, with per-job idempotency enforced by the background application layer.
- Google authorization: browser identity/token lifecycle is owned by `src/lib/googleAuthorization.ts`; `src/services/googleWorkspaceService.ts` is the application-facing capability boundary. `src/lib/googleApi.ts` is compatibility-only.
- Historical local Keep-compatible archive: `src/services/referenceArchiveService.ts`. The obsolete legacy Keep implementation has been physically removed.
- Settings: application-owned persistence, diagnostics, Calendar, Google, and Voice/Chat configuration boundaries are used by the Settings UI.
- Memory: structured IndexedDB memory remains authoritative; projections and retrieval traces are derived views.
- Agent tools: canonical registry/execution paths own tool declarations and dispatch rather than individual UI components.

The permanent Stage 4 architectural contract and executable lock suite live in `docs/STAGE4_FINAL_ARCHITECTURAL_HARDENING.md` and `src/architecture/finalArchitectureLock.test.ts`.

## Memory architecture

Elara's memory system is deliberately layered:

```text
conversation
    -> observation extraction
    -> structured memory store
    -> duplicate/conflict consolidation
    -> promotion/lifecycle maintenance
    -> contextual retrieval
    -> bounded Gemini context
```

Structured memory is the source of truth. Retrieval is deterministic and bounded, while maintenance can age/archive records without destroying historical provenance. The human-facing Scratchpad/Insights surfaces are projections and inspection tools rather than competing stores.

## Chat, runtime, and recovery

Normal Chat execution uses the canonical Gemini runtime contract. Model selection, tool exposure, streaming, resilience, abort handling, and recovery are kept behind runtime/application boundaries. Specialized surfaces can explicitly disable tools; OOC does so by policy rather than by editing a provider configuration object in the UI.

Browser-direct execution remains supported for static hosting. Server-backed execution remains available where an Express runtime is deployed.

Conversation drafts and recoverable outgoing messages use local recovery mechanisms. Background operations have explicit reconciliation and duplicate-completion handling.

## Workspace

Workspace state is persisted through the Workspace persistence boundary. Application operations belong to `workspaceService`; persistence mechanics belong below it. UI components must not import the underlying storage implementation directly.

Artifact revisions, restore, comparison, synchronization, and background reconciliation retain their existing persisted formats while using explicit ownership boundaries.

## Google integration

Google identity and OAuth token lifecycle have a single browser-side implementation authority. Capability authorization is incremental for browser Google integrations. The compatibility `googleApi` façade delegates to canonical service modules and contains no independent OAuth state.

Google Keep has two intentionally distinct concepts: the official Google Keep API integration remains available through `googleKeepService`, while historical local Keep-compatible notes are backed by `referenceArchiveService`. The obsolete local Keep implementation under `src/legacy` has been removed.

The background Google auth Worker is a separate trust domain. It stores its refresh-token record in the Cloudflare-backed vault and protects token/status/disconnect operations with `ELARA_BACKGROUND_TOKEN`.

## Persistence and Lockbox

IndexedDB is the durable application store for conversations, settings, and structured memory. Browser `localStorage` is used only where a projection or explicit compatibility/data-retention requirement exists.

Sensitive configuration is governed by the Lockbox manifest under `config/`. Direct `process.env` access is restricted to approved server/worker/automation adapters and is checked by the Lockbox audit.

Never commit real API keys, OAuth secrets, GitHub tokens, Cloudflare credentials, or automation secrets.

## Development checks

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Run the full production verification used by CI:

```bash
npm run verify:production
```

That verification includes Lockbox validation/audit/secret scanning, TypeScript checks, background-runtime typechecking, unit tests, the memory benchmark, and the production build.

## Feature-development contract

Future changes should follow:

```text
feature requirement
    -> owning domain/service
    -> stable contract
    -> infrastructure adapter (when required)
    -> UI composition
```

Do not introduce a second state authority, provider façade, persistence mirror, tool registry, renderer, or runtime execution path when an existing owner already exists.

Persistence/schema changes require migration and recovery coverage. Background changes require duplicate/retry/reload semantics. External authorization changes must preserve the applicable single-authority trust-domain model. Specialized model execution must declare tool exposure explicitly.

## Deployment notes

The frontend is Vite-based and can be deployed as a static site. The repository also contains an optional Express production server and a separate Cloudflare background runtime/Google-auth worker.

Cloud Run deployments should use the injected `PORT` value; the server now honors it while retaining port 3000 as the local-development default.

GitHub Pages deployment requires Pages to be enabled/configured for the repository. The static build itself succeeds; if the Pages workflow cannot create or configure the Pages site, resolve that repository-level GitHub Pages permission/configuration rather than changing application code.

## Historical architecture records

The repository retains Pass notes and architecture documents as historical evidence for why boundaries exist. They are not alternate implementations. New development should follow the canonical boundaries and the Stage 4 feature-safety contract rather than resurrecting older paths.
