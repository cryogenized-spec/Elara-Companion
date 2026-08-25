# Pass 24 — State Inventory

Status: completed and merged.

Pass 24 maps the significant Elara state objects, their current owners, persistence locations, mutation paths, derived/projection relationships, and synchronization mechanisms. This pass is inventory only: it does not relocate state or change persistence semantics.

## Executive ownership map

The application state controller `src/app/useApplicationStateController.ts` is currently the central owner of six major application-state domains:

| State | Current owner | Persisted by | Authority / notes |
| --- | --- | --- | --- |
| `conversations` | `useApplicationStateController` state; mutated by conversation/chat controllers | `src/lib/db.ts` via `setDbConversations` effect | Canonical application state. UI derives active conversation from `activeId`. |
| `folders` | `useApplicationStateController` state; mutated by conversation controller | `src/lib/db.ts` via `setDbFolders` effect | Canonical application state. Folder expansion is currently persisted as part of folder objects. |
| `activeId` | `useApplicationStateController` state; selected by UI/conversation controller | Not independently persisted | Session/application navigation state; on reload the first loaded conversation becomes active. |
| `settings` | `useApplicationStateController` state; settings controller and Settings UI mutate it | `src/lib/db.ts` via `setDbSettings` effect | Canonical settings object, though legacy compatibility fields remain inside/around the settings model. |
| `worldState` | `useApplicationStateController` state; World UI/controller mutate it | `src/lib/db.ts` via `setDbWorldState` effect | Canonical application state for world/life context. Legacy world storage remains a compatibility/extraction target. |
| `memoryState` | `useApplicationStateController` state; chat/memory flows mutate it | `src/services/memoryService.ts` -> `src/lib/db.ts` | Structured IndexedDB memory is authoritative. Scratchpad is a derived projection. |
| `customPortrait` | `useApplicationStateController` state; portrait UI mutates it | `src/lib/db.ts` via `setDbPortrait` effect | Canonical portrait value. Direct persistence from `App.tsx` was already identified as duplicate ownership and is a Pass 23 extraction target. |

## Application-shell / ephemeral state

`App.tsx` still owns several transient presentation/orchestration values. These are intentionally not application persistence domains.

- `currentView`: chat vs workspace navigation state.
- `isStreaming`: current chat execution state shared with command/stream controllers.
- `sidebarOpen`: mobile/desktop navigation presentation state.
- `settingsOpen`, `worldModalOpen`, `memoryModalOpen`, `viewerModalOpen`: modal visibility state.
- `activeCanvas`: currently displayed canvas/editor payload.
- `renameTargetId`, `deleteTargetId`: temporary UI targets for rename/delete confirmation flows.
- `portraitFileInputRef`, `messagesEndRef`, `scrollContainerRef`, `abortControllerRef`, `userHasScrolledUpRef`: imperative refs for DOM interaction, cancellation, and scroll orchestration.

These should remain ephemeral, but some orchestration currently lives in the shell and is a candidate for later controller extraction.

## Feature-controller state and mutation ownership

### Conversations

`src/features/conversations/useConversationController.ts` performs user-facing conversation/folder mutations by calling `setConversations`, `setFolders`, and `setActiveId`. It does not ordinarily persist directly; application-state effects perform persistence. It still directly owns export/import/clear compatibility operations through `src/lib/storage.ts` and `src/lib/db.ts`, which are separate responsibilities from ordinary state mutation.

### Chat

Chat controllers mutate conversation state, streaming state, and memory state through the application-state setters passed from the shell. Chat execution state includes cancellation and scroll coordination. The canonical runtime/service boundaries exist, but chat still contains transitional provider/transport knowledge noted by Pass 18.

### Settings

`useSettingsController` owns ephemeral theme presentation state and updates the canonical `settings` application state. Theme DOM application is currently performed inside the settings controller. Settings persistence itself belongs to the application state controller.

### Workspace

Workspace navigation state (`activeArtifactId`, current view callbacks) is owned by the Workspace controller. Workspace domain/persistence state is held separately by the Workspace subsystem and its storage/service boundary. This is a deliberate second state boundary because Workspace contains artifact/revision semantics beyond the basic application-state object.

### Background runtime

The background runtime owns durable job records in local storage and runtime polling/recovery state. The React controller reconciles completed/failed jobs into conversation state. The service boundary introduced in Pass 21 is now the application-facing entry point; the underlying client remains transitional.

## Persistence surfaces

Elara currently has several persistence mechanisms, each with a distinct role:

### IndexedDB — primary application persistence

`src/lib/db.ts` is the primary persistence adapter for conversations, folders, settings, world state, portrait and structured memory. `useApplicationStateController` is the canonical application synchronization owner for those domains.

### Workspace storage

`src/lib/workspaceStorage.ts` persists Workspace/artifact state, including revisions/checkpoints and active-artifact information. `src/services/workspaceService.ts` is the application-facing boundary.

### Background job localStorage

`src/lib/backgroundChatClient.ts` stores background-runtime configuration and durable job records in local storage. `src/services/backgroundRuntimeService.ts` is the application-facing boundary.

### Scratchpad projection

Scratchpad text is intentionally a derived/human-facing projection. `src/services/scratchpadService.ts` is the UI/application boundary. Structured memory remains authoritative. Manual scratchpad edits therefore do not redefine canonical memory state.

### Thinking-display preference

Thinking display mode has its own small persistence surface and is handled through the model-tuning service. It is presentation configuration rather than core application domain state.

### Legacy/compatibility stores

Legacy localStorage-oriented memory/world/storage modules remain only where they provide migration, import/export, compatibility, or other still-required behaviour. They must not become competing sources of truth.

## Derived state / projections

The following are explicitly derived rather than authoritative:

- `activeConversation` is derived from `conversations` + `activeId`.
- `activePortrait` is derived from `customPortrait` with the default portrait fallback.
- Scratchpad text is derived from structured memory and is an inspection/editing projection.
- Model-tuning display values are derived from the selected model profile plus canonical settings.
- UI visibility flags and scroll/cancellation refs are ephemeral interaction state.

## Synchronization paths

Current synchronization is primarily effect-driven from the application state controller:

`React application state -> persistence adapter`

for conversations, folders, settings, world state, memory and portrait.

Other subsystems synchronize through explicit service/storage calls, localStorage records, browser events and controller reconciliation. Background completion is a particularly important cross-boundary synchronization path because it can update both conversations and Workspace/artifact state.

## State-consistency risks identified

Pass 24 identifies the following concrete areas for later work:

1. The application state controller persists several domains through generic effects, while Workspace and background runtime maintain separate persistence systems. These boundaries need explicit ownership contracts rather than accidental coupling.
2. `activeId` is session state and is not persisted independently; this is currently intentional but should remain documented.
3. Settings have a canonical object but still contain legacy compatibility fields and separate presentation-state preferences.
4. Workspace state exists outside the main application-state object and includes artifact/revision semantics that should not be flattened merely for uniformity.
5. Background job reconciliation can cross from runtime state into conversation and Workspace state and must not create stale competing versions.
6. Legacy compatibility stores must continue to shrink rather than become alternate authorities.
7. `App.tsx` still carries several orchestration refs and UI flags; their existence is not itself a persistence problem, but they should not grow into a second application-state owner.

## Rules for Pass 25+

- Every major domain must have one authoritative state representation.
- Persistence mechanisms are implementation details behind explicit boundaries; they are not state owners by accident.
- Derived state must remain derived and should not become a second persisted authority.
- A migration/compatibility representation must have an explicit reason to exist and a defined removal condition.
- Cross-domain synchronization must identify which side is authoritative and which side is reacting.
- Future state changes should update the canonical owner and allow the existing synchronization boundary to persist them; do not add ad-hoc direct persistence writes.

## Handoff notes

Pass 24 is intentionally descriptive. No state relocation was performed. The purpose is to give Pass 25 a precise starting point for establishing single sources of truth and to prevent future threads from re-auditing the same ownership questions from scratch.
