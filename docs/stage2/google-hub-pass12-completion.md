# Google Hub — Pass 12 Completion

## Objective

Complete the original user-facing capability UX across the nine Google Hub capabilities. This pass is not considered complete merely because provider services or panels exist; every promised user-facing action must be represented, wired to the provider-backed implementation, permission-gated where appropriate, and protected by a durable acceptance check.

## Acceptance matrix

### Gmail
- [x] Recent/searchable mail surface.
- [x] From filter.
- [x] To filter.
- [x] After/before date filters.
- [x] Unread filter.
- [x] Attachment filter.
- [x] Message inspection.
- [x] Open Gmail.
- [x] Ask Elara.
- [x] Draft creation gated by gmail.compose.
- [x] Send gated by gmail.send.

### Calendar
- [x] Today range.
- [x] Tomorrow range.
- [x] Next 7 days range.
- [x] Upcoming refresh.
- [x] Find availability.
- [x] Create event gated by calendar.write.
- [x] Open Calendar.
- [x] Ask Elara.

### Drive
- [x] Search/recent listing via provider query.
- [x] Inspect readable files.
- [x] Work with selected file through Ask Elara context.
- [x] Upload gated by drive.file.
- [x] Open Drive.
- [x] Ask Elara.

### Docs
- [x] Recent/search listing.
- [x] Open/read document.
- [x] Create document.
- [x] Work with selected document through Ask Elara context.
- [x] Update/append content.
- [x] Open Google Docs.
- [x] Ask Elara.

### Sheets
- [x] Recent spreadsheet listing.
- [x] Lightweight range preview.
- [x] Inspect range.
- [x] Create spreadsheet gated by sheets.write.
- [x] Write/save changes gated by sheets.write.
- [x] Work with selected sheet through Ask Elara context.
- [x] Open Sheets.
- [x] Ask Elara.

### Tasks
- [x] Today view.
- [x] Upcoming view.
- [x] All view.
- [x] Refresh/list.
- [x] Create task.
- [x] Complete task.
- [x] Open Google Tasks.
- [x] Ask Elara.

### Keep
- [x] Search notes.
- [x] Recent notes.
- [x] Create note gated by keep.write.
- [x] Delete note gated by keep.write.
- [x] Pin note to Elara's local reference context.
- [x] Work with selected note through Ask Elara context.
- [x] Open Keep.
- [x] Ask Elara.

### Contacts
- [x] Search contacts.
- [x] Recent/list contacts.
- [x] Open Contacts.
- [x] Ask Elara.

### Google Chat
- [x] List spaces.
- [x] Select/read messages.
- [x] Send message gated by chat.send.
- [x] Create/manage space gated by chat.manage.
- [x] Open Google Chat.
- [x] Ask Elara.

## Cross-capability requirements

- [x] All panels remain provider-backed.
- [x] No provider credentials are exposed to panel props or Google Hub context.
- [x] Action-level permission gates are preserved.
- [x] Consequential actions retain explicit confirmation metadata in the capability registry.
- [x] Each capability has an activity hook.
- [x] The Hub uses the registered module registry rather than service-specific rendering branches.
- [x] The original capability action set is asserted in `src/services/googleCapabilityRegistry.test.ts`.

## Implementation changes in Pass 12

- `GmailCapabilityPanel.tsx`: practical mail filtering, inspection, direct Gmail entry point, compose/send gates.
- `CalendarCapabilityPanel.tsx`: Today/Tomorrow/Next 7 days, availability, event creation, direct Calendar entry point.
- `DriveCapabilityPanel.tsx`: provider search, inspection, upload, work-with-file context, direct Drive entry point.
- `DocsCapabilityPanel.tsx`: search/open/create/update/work-with-document, direct Docs entry point.
- `SheetsCapabilityPanel.tsx`: recent spreadsheet workflow, range inspection, write/create, work-with-sheet, direct Sheets entry point, Ask Elara.
- `TasksCapabilityPanel.tsx`: Today/Upcoming/All filtering, create/complete, direct Tasks entry point, Ask Elara.
- `KeepCapabilityPanel.tsx`: search/recent, create/delete, Pin to Elara, work-with-note, direct Keep entry point, Ask Elara.
- `ContactsCapabilityPanel.tsx`: search/list, direct Contacts entry point, Ask Elara.
- `ChatCapabilityPanel.tsx`: spaces/messages/send/manage, direct Chat entry point, Ask Elara.
- `googleCapabilityModules.tsx`: consistent Ask Elara wiring for registered panels.
- `googleCapabilityRegistry.test.ts`: complete Pass 12 action acceptance matrix.

## Verification

Source-level acceptance review completed against the Pass 12 specification. The test suite contains executable assertions for the capability action matrix and module registration invariants.

A dependency-backed TypeScript/lint/test/build execution is still not available in the current environment; no green CI/local execution is claimed without actual execution evidence.

Pass 13 adds a canonical capability-state projector and exhaustive authorization/action-state tests so the UX truth and agent truth cannot drift independently.
