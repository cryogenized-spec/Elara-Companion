# Stage 4 — Final Architectural Hardening

## Purpose

Stage 4 is the proving and lock-down phase. It does not introduce new application features and it does not create another parallel architecture. Its purpose is to make the boundaries established during the rehabilitation mechanically visible, testable, and safe for future feature development.

## Canonical ownership rules

- Conversation lifecycle belongs to the conversation/application state layer.
- Chat streaming and provider execution belong behind the Gemini runtime contract.
- OOC execution is a specialised runtime consumer and must remain tool-free by explicit policy.
- Workspace application mutations belong to `workspaceService`; persistence belongs behind `workspacePersistenceService`.
- Background Workspace reconciliation uses the Workspace persistence boundary and must be idempotent per durable job id.
- Google identity/OAuth authority belongs to `googleWorkspaceService`/`googleAuthorization`; `googleApi` is compatibility-only.
- Historical local Keep-compatible data is owned by `referenceArchiveService`; the deleted legacy Keep implementation must not return.
- Memory state is authoritative in the Memory service. Retrieval and context assembly are read/projection concerns and must not mutate Memory state.
- Scratchpad/profile projection storage is infrastructure, accessed through application-facing services where the consuming feature needs a boundary.
- UI components must not directly own provider clients, low-level persistence, OAuth state, Workspace storage, or model/tool execution.

## Allowed compatibility

Compatibility code is permitted only when it protects one of the following:

1. Existing persisted user data.
2. A still-supported external contract.
3. A verified migration boundary.
4. A temporary internal transition with a documented owner and deletion condition.

Compatibility code must not become a second implementation authority.

## Feature-development safety contract

Future feature work should follow this sequence:

`feature requirement -> owning domain/service -> stable contract -> infrastructure adapter (when required) -> UI composition`

A feature must not reach into another feature's private state or infrastructure implementation.

A new capability should be implemented by extending one owning domain or service rather than adding another global helper, provider façade, or shared state mirror.

Changes to persistence schemas must include migration/recovery coverage. Changes to external authorization must preserve the single-authority OAuth model. Changes to background behaviour must include duplicate/retry/reload semantics. Changes to model execution must use the runtime contract and must declare tool exposure explicitly when specialised.

## Final audit checklist

Before Stage 1.5 is declared complete, the repository should prove:

- no UI imports `googleApi` directly;
- no UI imports `workspaceStorage` directly;
- the deleted Keep implementation is absent;
- no production source imports the deleted Keep path;
- Google OAuth state has one implementation owner;
- OOC model execution is service-owned and explicitly tool-free;
- `contextManager` contains no duplicated context/retrieval implementation;
- Workspace background reconciliation is behind the persistence boundary and idempotent;
- Workspace editor/application mutations have one application owner;
- direct low-level persistence access from UI is absent for the rehabilitated Settings/Workspace boundaries;
- compatibility façades contain delegation rather than competing implementations;
- production typecheck, tests, build and repository verification are green;
- migration/reload/recovery tests cover the persistence boundaries that were changed.

## Definition of done

Stage 4 is complete when the architecture is not merely documented but enforced by executable tests and production verification, and the final repository census contains no unexplained ownership conflicts or accidental duplicate implementations.

At that point the project can move into feature development with a clear expectation: adding capability should extend an existing owner/contract rather than reopen unrelated infrastructure.
