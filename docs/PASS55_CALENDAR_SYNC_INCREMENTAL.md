# Calendar Pass 4 — SyncToken and Local Incremental Synchronization

Calendar Pass 4 adds a durable local synchronization path on top of the canonical Calendar service and infrastructure boundary.

## Synchronization contract

The canonical infrastructure adapter uses Google Calendar `events.list` with `showDeleted=true`. A full synchronization follows every `pageToken` until the final page and records the returned `nextSyncToken`. Incremental synchronization supplies that opaque token on the next request. Google requires sync-token requests to avoid parameters such as `timeMin`, `timeMax`, `orderBy`, and `singleEvents`; the synchronization path therefore stores canonical event resources rather than a pre-expanded upcoming-event projection.

The local application service applies changed events by ID and treats `status=cancelled` resources as removals. The newly returned sync token is not published to local state until all provider pages have completed successfully, preventing a partially synchronized snapshot from being paired with an advanced token.

## Expired tokens

Google can invalidate an older sync token and return HTTP 410. The infrastructure adapter converts that case into `CalendarSyncTokenExpiredError` when an incremental token was actually supplied. The application service then discards the affected local snapshot and performs one clean full synchronization, replacing both the stored events and token together.

## Local persistence and concurrency

Per-calendar sync state is stored in IndexedDB under a dedicated versioned key. State includes the calendar ID, opaque sync token, normalized canonical events, and the last successful synchronization timestamp. Non-browser/test contexts fall back to an in-memory copy without changing the production persistence path.

A per-calendar promise lock prevents concurrent callers within the same runtime from racing the same persisted snapshot. App-wide storage clearing also removes Calendar synchronization state.

## Scope and boundaries

Calendar synchronization remains an application/service capability and is exposed through `GoogleCalendarContract`. The synchronization code contains no browser OAuth implementation and no credential persistence. Direct Calendar REST calls remain confined to `src/infrastructure/googleCalendarApi.ts`.

Push/watch notifications, agent/tool exposure, and user-facing Calendar synchronization workflows remain intentionally deferred to later Calendar passes.
