# Elara Canonical Architecture

Status: locked at Pass 15 of the Architectural Rehabilitation Programme.

This document is the current architectural source of truth for the successor repository. It records the boundaries that have actually been established, rather than describing a future scaffold. Future work must extend these canonical paths instead of introducing parallel implementations.

## Core rule

One authoritative implementation per responsibility.

Compatibility code is permitted only when it protects persisted data, migrations, external contracts, or a verified recovery path. A legacy implementation must not remain merely because it is familiar or because an earlier provider generated it.

The legacy repository `cryogenized-spec/Elara-companion-app-v2` remains the historical/recovery reference. It is not an implementation source for new features.

## Application composition

`src/main.tsx` is the browser entry point. It installs platform/runtime bootstrap hooks and composes the application shell.

`src/App.tsx` is the application shell. Its responsibility is composition and view-level coordination; domain mechanics belong to the extracted controllers and runtime boundaries below.

Application state hydration and synchronization are centralized in `src/app/useApplicationStateController.ts`.

## Feature ownership

Conversation lifecycle is owned by `src/features/conversations/useConversationController.ts`.

Chat execution and response streaming are owned by the chat feature controllers under `src/features/chat/`, with model execution behind the runtime boundary.

Workspace navigation/orchestration is owned by `src/features/workspace/useWorkspaceController.ts` and the Workspace services/storage it invokes.

Settings coordination is owned by `src/features/settings/useSettingsController.ts`. Settings UI is composed through the canonical settings surfaces, including `VoiceChatSettingsPanel` and its Voice Input, Chat & Editor, and Reliability children.

Background lifecycle is owned by `src/runtime/useBackgroundRuntimeController.ts` and the dedicated background runtime.

## Persistence ownership

IndexedDB application persistence is canonicalized through `src/lib/db.ts` and the application state controller.

Feature controllers mutate application state; they do not duplicate ordinary IndexedDB writes for state that is already synchronized by the application persistence boundary.

Legacy persisted fields may remain temporarily when they are required for migration compatibility. They are not treated as authoritative over the canonical structured representation.

## Chat and rendering

Chat execution is centralized through `src/lib/chatRuntime.ts` plus the established chat controllers. Model-specific execution details are not owned by React components.

`src/components/ChatMessage.tsx` is the canonical chat-message entry component. It may wrap internal rendering implementation, but no second application-level chat message route should be introduced.

Markdown rendering is unified through the canonical message renderer path. New message surfaces must reuse the existing renderer rather than create a second Markdown implementation.

## Voice and Chat settings

The canonical Voice & Chat settings route is `VoiceChatSettingsPanel`.

It owns the three established settings domains:

- Voice Input
- Chat & Editor
- Reliability

`SettingsModal` is the entry surface that hosts this canonical panel. Legacy Voice/Chat settings routes must not be reintroduced.

The remaining legacy voice fields are migration data, not a second settings UI or runtime implementation.

## Memory

Structured IndexedDB memory is authoritative.

The memory subsystem consists of extraction, consolidation/promotion, retrieval, bounded Gemini context integration, maintenance/decay, and transparency/inspection surfaces. The Scratchpad is a derived human-facing projection and must not become a competing memory store.

## Workspace and artifacts

Workspace/artifact operations remain centralized in the existing Workspace storage, revision, comparison, restore, synchronization, and tool boundaries. UI components consume those capabilities rather than becoming independent persistence owners.

Legacy Canvas data can remain only as an explicitly supported historical data representation. It must not become a second active artifact architecture.

## Google integration

Google capability declarations and authenticated operations are centralized through the established Google capability/tool boundaries and API helpers. UI surfaces configure or request capabilities; they do not become independent Google protocol implementations.

## Runtime and background execution

Gemini/model calls, streaming, retries, cancellation, model health/fallback behaviour, and tool loops belong behind the runtime boundary.

Background execution and recovery belong to the dedicated background-runtime path. A new background feature must not require knowledge of the React chat shell.

## What is prohibited

Do not add a parallel Settings implementation.

Do not add a second chat message renderer or Markdown renderer.

Do not add direct feature-level persistence writes where the application persistence boundary already owns synchronization.

Do not introduce a second Gemini/model execution path without an explicit architectural decision.

Do not resurrect deleted migration workflows, pass trigger files, or one-shot source-rewrite machinery.

Do not copy legacy repository implementations into the successor repository merely because they already exist there.

## Change rule for future passes

Every architectural pass should answer three questions before changing code:

1. Which existing implementation is canonical?
2. What responsibility is being moved, removed, or isolated?
3. What previously competing path must remain absent after the change?

A pass is incomplete if it leaves the application with two plausible owners for the same responsibility.
