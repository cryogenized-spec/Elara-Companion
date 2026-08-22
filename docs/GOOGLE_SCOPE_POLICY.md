# Google OAuth Scope Policy

## Status
Stage 2 of the Google authentication redesign. This document defines the target least-privilege authorization contract. It does not yet change the live OAuth request.

## Initial Google connection

The initial connection requests only:

- `openid`
- `email`
- `profile`

This establishes Google identity without requesting Workspace data permissions.

Google recommends incremental authorization when an application can ask for additional scopes in context rather than presenting an overwhelming initial consent request. The current Google Identity Services documentation also recommends the authorization-code model for backend-backed web applications. See the official Google Identity Services and OAuth scope documentation.

## Capability grants

### Gmail

`gmail.read` → `gmail.readonly` for listing and reading messages.

`gmail.compose` → `gmail.compose` for creating drafts.

`gmail.send` → `gmail.send` for sending messages.

`gmail.modify` → `gmail.modify` only when Elara actually needs mailbox mutation/label operations.

### Calendar

`calendar.read` → `calendar.readonly` for reading calendar data.

`calendar.write` → `calendar.events` for event creation/editing. Keep the broad `calendar` scope out of the initial request.

### Tasks

`tasks` → `tasks`. Request only when Tasks functionality is enabled.

### Docs / Drive

`docs` → `documents` for Docs operations.

`drive.read` → `drive.readonly` only when broad Drive search/read is actually needed.

`drive.file` → `drive.file` for files created or explicitly used by Elara; prefer this narrower file-scoped capability where possible.

### Sheets

`sheets.read` → `spreadsheets.readonly` for read operations.

`sheets.write` → `spreadsheets` for write operations.

### Keep

`keep.read` → `keep.readonly` for read operations.

`keep.write` → `keep` only for genuine Keep create/edit/delete functionality and only after explicit capability escalation. The current failing global request must never include this scope.

### Contacts

`contacts.read` → `contacts.readonly` only when contact lookup is actually needed.

### Google Chat

`chat.read` → the three read-only Chat scopes needed by the concrete read operations.

`chat.send` → `chat.messages.create` only when Elara is sending a Chat message.

`chat.manage` → management scopes only when Elara actually needs to create/manage spaces, messages, or memberships. Treat this as an explicit elevated capability.

## Design rules

1. The initial Google connection must not request Workspace data scopes.
2. A capability is authorized when a user enables or invokes that capability, not simply because Elara contains code for it.
3. Read and write capabilities should be separate whenever Google provides narrower scopes.
4. Full Keep access is an elevated capability and must never be part of the base connection.
5. The live implementation should consume this contract rather than keeping a second hard-coded scope list.
6. Stage 3 will implement the authorization flow against this contract; this stage deliberately leaves the existing browser request unchanged.

## Evidence

Google's current OAuth scope catalogue lists `keep` as full Keep read/edit/create/delete access and `keep.readonly` as read-only access. Google also documents incremental authorization and recommends the authorization-code model with popup UX for backend-backed applications.
