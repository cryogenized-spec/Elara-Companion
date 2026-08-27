# Stage 2 — Google Hub Pass 1: UX / Domain Audit

Status: COMPLETE
Date: 2026-08-27
Base: `main` after Stage 1.5 hardening

## Purpose

Map the existing Google-related Settings surface and its service boundaries before making UI changes. This pass deliberately makes no product/UI redesign changes. Its output is the extraction map for Pass 2 and the following implementation passes.

## Current UI reality

The Google functionality currently lives inside the `SettingsModal` `workspace` tab, labelled **Google Workspace & Sync**. The tab is a single vertically scrolling surface containing multiple unrelated operational concerns, each with its own React state, loading/error handling, handlers, and controls.

Observed UI responsibilities include:

- Base Google connection/authentication.
- Gmail inbox retrieval and preview.
- Gmail quick compose, draft creation, and direct send.
- Google Calendar manual sync and event preview.
- Google Tasks manual sync and task preview.
- Google Docs export and Drive-backed document search/read/edit.
- Google Sheets creation.
- Google Contacts search/sync.
- Google Keep/local reference-note archive management.
- Google Chat spaces, messages, cards, webhook registration, test dispatch and proactive push.
- Miscellaneous troubleshooting/status controls related to Google Chat/webhooks.

The current page therefore mixes four different UX categories:

1. Identity and authorization.
2. Information retrieval/browsing.
3. External mutation/action controls.
4. Developer/operational diagnostics.

These should not remain in one vertical panel.

## Current service ownership

The underlying Google implementation is already substantially modular:

- `googleWorkspaceService.ts` — canonical Google identity/auth state and capability-policy access.
- `googleAuthorization.ts` — browser Google Identity Services token client, base authorization, incremental capability authorization, revocation and token state.
- `googleCapabilityPolicy.ts` — capability-to-scope policy and granted-scope checks.
- `settingsGoogleService.ts` — currently a compatibility/facade export surface for Settings consumers.
- `googleGmailService.ts` — Gmail read/send/draft operations.
- `googleCalendarService.ts` / `settingsCalendarService.ts` — Calendar retrieval/application boundary.
- `googleTasksService.ts` — Tasks retrieval/actions.
- `googleDocsDriveService.ts` — Docs and Drive-backed document operations.
- `googleSheetsService.ts` — Sheets operations.
- `googleContactsService.ts` — Contacts retrieval.
- `googleChatService.ts` — Google Chat and card/webhook operations.
- `referenceArchiveService.ts` — local historical Keep/reference archive; not official Google Keep storage.

This means the immediate problem is primarily **UI composition and capability modeling**, not lack of backend/service modularity.

## Authorization finding

Current base Google authorization requests only `openid email profile`. Service capabilities are authorized incrementally through `requestGoogleCapabilityAuthorization(scopes, ...)` with `include_granted_scopes: true`.

This is compatible with the intended design:

**one Google identity** + **incremental capability grants**.

The new Hub should expose this distinction explicitly. The user should not feel as though Gmail, Sheets, Calendar, etc. are separate accounts or separate logins.

## Current capability policy

The current policy already has atomic permissions such as:

- `gmail.read`
- `gmail.compose`
- `gmail.send`
- `gmail.modify`
- `calendar.read`
- `calendar.write`
- `tasks`
- `docs`
- `drive.read`
- `drive.file`
- `sheets.read`
- `sheets.write`
- `keep.read`
- `keep.write`
- `contacts.read`
- `chat.read`
- `chat.send`
- `chat.manage`

This is a strong foundation for the planned capability registry. The Hub should consume this policy rather than inventing a second permission model.

## Problems to remove from the current UI

### 1. One giant Google panel

Current Google Workspace & Sync is effectively a large control-room dump. It mixes unrelated domains and makes discovery poor.

### 2. Manual-sync mental model

Buttons such as `Sync Calendar Now`, `Sync Tasks Now`, and manual Gmail sync imply that the user must operate Elara like a data-import utility. The future model should be on-demand/retrieval-oriented, with automatic lightweight status/metadata loading where useful and explicit fetches for substantive data.

### 3. Direct send exposed next to testing controls

Gmail compose/send currently appears as a quick-test-like form in Settings. The redesigned UI should separate normal user actions from diagnostics and should make `Send` materially more deliberate, with autonomous sending remaining separately permissioned and off by default.

### 4. Developer operations mixed with user features

Google Chat webhook registration, proactive push, test cards and troubleshooting are operational/developer surfaces and should not dominate the normal Google user experience.

### 5. Google product duplication

The UI currently tries to partially reproduce Gmail, Calendar, Docs, Tasks, Keep and Chat. The new design should instead provide concise previews, search, actions, shortcuts and `Ask Elara`, leaving full application editing to Google's own interfaces.

## Proposed first-class Hub structure

The target Google Settings area should contain four top-level sub-tabs:

### Account

Identity, connection state, account email, last verification, enabled capability summary, manage/disconnect controls.

### Services

A registry-driven capability catalogue. Each capability owns its metadata, authorization requirements, summary and detailed panel.

Initial candidates:

- Gmail
- Calendar
- Drive
- Docs
- Sheets
- Tasks
- Keep / Reference
- Contacts
- Google Chat

Future capabilities must be addable by registration rather than editing a monolithic Hub component.

### Activity

User-visible, domain-event-backed record of Google-related operations performed by Elara. This should distinguish read, draft, mutation, external-send and irreversible actions. Reversible actions can later expose rollback where the underlying provider supports a safe inverse.

### Permissions

Clear capability-level authorization status, scope explanations, data-access explanation, and revoke/enable controls.

## Capability design requirements

The final capability contract should support, at minimum:

- stable id
- display name/description
- icon/presentation metadata
- required Google scopes
- authorization state
- summary retrieval
- detailed panel/view
- supported actions
- external-app deep links
- safety/confirmation requirements
- optional activity/event metadata

The registry owns composition. Individual capabilities own their provider-specific logic and view model. The Google Hub must not contain Gmail/Sheets/etc. implementation logic.

## UX design principles for implementation

- Functional information over decorative statistics.
- Quiet, restrained visual treatment.
- Real status indicators only; no simulated activity.
- Small previews instead of miniature Google-app clones.
- `Ask Elara` as a first-class action for reasoning over Google data.
- External-app shortcuts for full editing in Gmail/Calendar/Docs/Sheets/Tasks/Keep/Drive.
- Read access and mutation permissions presented separately where appropriate.
- Autonomous external actions remain opt-in and off by default.
- Reversible actions should be designed for rollback/audit where technically possible.
- Initial Google Hub shell must remain provider-agnostic enough to support future non-Google providers.

## Explicit decisions for later implementation passes

1. Keep one base Google identity/connection.
2. Use incremental capability authorization instead of repeated service-specific sign-ins.
3. Do not continuously mirror entire Google services into the app.
4. Prefer metadata/indexing + on-demand retrieval.
5. Keep Settings informational/control-oriented; use dedicated services for actual operations.
6. Keep developer/diagnostic controls separate from normal user-facing service panels.
7. Treat Gmail Send and other externally consequential mutations as distinct capabilities from read access.
8. Keep autonomous sending disabled by default.
9. Build capability registration as the extension mechanism.

## Recommended implementation sequence

Pass 2 — Capability contract + registry.
Pass 3 — Unified authorization/capability state.
Pass 4 — Hub shell: Account / Services / Activity / Permissions.
Pass 5 — Gmail capability.
Pass 6 — Calendar + Tasks.
Pass 7 — Drive / Docs / Sheets.
Pass 8 — Keep / Contacts / Chat and remaining capabilities.
Pass 9 — Activity + permissions UX.
Pass 10 — Full integration/proving pass.

## Pass 1 acceptance criteria

- Existing Google UI responsibilities identified.
- Existing Google services identified.
- Existing authorization model identified.
- Existing capability policy identified.
- User-facing vs operational/debug functionality separated conceptually.
- Extraction map recorded for subsequent implementation passes.
- No application behavior changed in Pass 1.
