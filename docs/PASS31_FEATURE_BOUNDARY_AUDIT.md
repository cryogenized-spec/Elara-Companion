# Pass 31 — Feature / Module Boundary Audit

## Purpose

Determine whether Elara's major capabilities can evolve independently without reopening unrelated subsystems, and identify every current coupling that would make that difficult.

This pass is an audit and boundary-contract pass. It is **not** the physical extraction of every remaining transitional dependency; those removals belong to the later passes that own runtime, settings, event/command and testing architecture.

## Canonical capability boundaries

| Capability | Canonical application surface | Authoritative state / implementation | Current extension pressure |
|---|---|---|---|
| Chat | `src/features/chat/` | Chat feature controllers + runtime/service contracts | High. `useChatStreamController` still coordinates Gemini, background jobs, Workspace, Memory, Google token access, projections and some persistence directly. |
| Conversation | `useConversationController` + application state controller | Application conversation/folder state | Medium. Some shell/application-state coordination remains. |
| Settings | `useSettingsController`, canonical settings panels | `ElaraSettings` in application state | High. `SettingsModal` remains a legacy concentration point containing provider/persistence concerns. |
| Workspace | `workspaceService` | `workspaceStorage` + application Workspace state | Medium. Chat still reaches Workspace directly during streaming; this is a runtime/service extraction target. |
| Memory | `memoryService` | IndexedDB-backed memory state | Low-to-medium. Chat still owns extraction orchestration; retrieval is now routed through authoritative memory state. |
| Voice & Chat settings | `VoiceChatSettingsPanel` and child panels | Canonical `voiceSettings` domain | Low. Legacy migration fields remain only for persisted-data compatibility. |
| Google | `googleWorkspaceService` | `googleAuthorization` + capability policy; Google APIs remain remote-authoritative | High. `googleApi.ts` still contains a competing legacy OAuth implementation and broad provider surface. |
| Background Runtime | `backgroundRuntimeService` | `backgroundChatClient` persistent job state | Medium. Runtime-to-Workspace reconciliation remains below the service boundary and foreground chat still contains transitional job handling. |
| Model tuning | `modelTuningService` | settings + model discovery/theme services | Low-to-medium. Canonical service exists; remaining settings concentration is the larger issue. |
| Scratchpad / projections | `scratchpadService` / projection storage | Derived local projection | Low. Memory authority no longer depends on the projection. |

## Dependency-direction rules

1. Features may depend on shared domain types, approved services, and lower-level utilities according to the canonical architecture.
2. Features must not import sibling features directly.
3. React UI must not become the owner of persistence, provider credentials, or external-resource truth.
4. A feature may request a capability from a service; it must not reach through the service into the provider implementation.
5. Transitional dependencies are allowed only when they are explicitly recorded here and assigned to a later pass.
6. Adding a new feature must not require modifying an unrelated feature merely to wire provider/persistence internals.

The executable `featureBoundaries.test.ts` enforces rule 2. The remaining rules are enforced progressively through the programme's service and state-boundary passes.

## Cross-feature coupling audit

### Chat → other features

**Direct sibling-feature imports:** none found; this is protected by the boundary test.

**Shared-service dependencies:** legitimate and expected once Chat uses the service layer.

**Transitional infrastructure dependencies:** significant. The current Chat stream controller still reaches directly into Gemini, Google token access, background transport, Workspace storage, memory reduction/persistence, and projection helpers. These are not sibling-feature coupling, but they are the principal reason Chat remains the highest extension-pressure module.

**What happens when adding a Chat capability?** New chat behaviour can normally be implemented within Chat, but anything involving tools, external providers, Workspace artifacts, Memory, or background execution still risks reopening the controller because orchestration ownership is concentrated there.

**Assigned follow-up:** Pass 18 runtime extraction, Pass 19 Workspace boundary, Pass 20 Memory boundary, Pass 21 Background boundary, Pass 22 UI purity, and later Pass 33 command/event boundaries. Remaining Chat consolidation should be completed during those passes rather than duplicated here.

### Settings → other capabilities

The canonical settings controller is bounded, but `SettingsModal` remains a broad legacy surface. It can still coordinate Google operations, snapshots and other infrastructure. This creates extension pressure: adding settings for a new provider or capability risks reopening the monolithic modal.

**Assigned follow-up:** Pass 10/12 history is preserved; the remaining physical decomposition belongs to the settings consolidation work already identified under Programme 2 and later boundary passes.

### Google → external systems

Google resource ownership is correctly remote-authoritative. The remaining issue is provider-internal duplication: `googleApi.ts` still owns a legacy OAuth/token path alongside `googleAuthorization.ts`.

**Assigned follow-up:** complete the provider credential-injection migration before production transition; do not create a third authorization layer.

### Workspace → Chat / Runtime

Workspace has a service boundary, but streaming/tool-result reconciliation still reaches the storage layer below it. This means Workspace can still be reopened when changing Chat tool behaviour.

**Assigned follow-up:** finish runtime/service extraction and later event/command boundary work.

### Memory → Chat

The data authority is now centralized, but Chat still owns the timing/orchestration of memory extraction after a response. This is acceptable as transitional application orchestration; it is not a second memory authority.

**Assigned follow-up:** Pass 33 command/event boundaries and later testing architecture.

### Background Runtime → Conversation / Workspace

The persistent job identity and recovery model are now independently keyed by `jobId`. The remaining extension pressure is reconciliation policy: background completion can still touch conversation/Workspace behaviour from runtime code.

**Assigned follow-up:** event/command boundary work, not another direct cross-feature dependency.

## Extension-pressure ranking

### High — must be reduced before production transition

`useChatStreamController` — integration hub for Gemini, Google, Background Runtime, Workspace, Memory and persistence.

`SettingsModal` — legacy concentration point for provider/configuration/persistence concerns.

`googleApi.ts` — legacy competing OAuth/provider authority.

### Medium — bounded but still coupled

Background completion reconciliation into Workspace/conversation state.

App-shell direct knowledge of remaining legacy persistence operations.

Workspace tool/result persistence from Chat streaming.

### Low — healthy boundaries already established

Voice & Chat settings canonical route.

Memory retrieval authority versus scratchpad projection.

Model tuning service.

Feature-to-feature sibling-import isolation.

## “Can I add a feature without reopening unrelated modules?” test

A new purely local UI feature can be added without reopening existing features.

A new capability that consumes existing services can be added behind a new service/feature boundary without sibling-feature imports.

A new provider-backed capability is **not yet fully isolated**, because Google and Chat still contain transitional provider/runtime knowledge and Settings remains broad.

A new autonomous/background capability is **not yet fully isolated**, because reconciliation policy still crosses the runtime/service boundary directly.

Therefore the correct current verdict is:

**The feature/module architecture is structurally sound enough to continue the programme, but not yet fully extensible. The remaining extension pressure is concentrated and named rather than diffuse.**

## Completion criteria for this pass

Pass 31 is considered complete only when:

- sibling-feature coupling is machine-guarded;
- every major feature has a named canonical boundary;
- every high/medium extension-pressure hotspot has an explicit owner and future pass;
- no transitional coupling is silently treated as canonical;
- the audit leaves enough information for a future thread to continue without rediscovering the dependency graph.

Those conditions are now satisfied by this audit plus `src/lib/__tests__/featureBoundaries.test.ts` and the canonical architecture records.
