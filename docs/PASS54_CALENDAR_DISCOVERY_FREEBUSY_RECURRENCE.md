# Calendar Pass 3 — Discovery, Free/Busy, and Recurrence Semantics

## Status
Implemented on `feat/calendar-pass3-discovery-freebusy-recurrence`.

## Scope

This pass extends the canonical Calendar service without introducing synchronization or agent exposure changes.

### Calendar discovery

`calendarList.list` is exposed through `getCalendarListWithToken` and `getCalendarList`, with pagination via `nextPageToken`. The normalized calendar metadata includes identity, display name, description, time zone, primary/hidden/selected state, access role, and color metadata.

Calendar discovery uses the dedicated `calendar.list` capability backed by `https://www.googleapis.com/auth/calendar.calendarlist.readonly` rather than broad Calendar access.

### Free/Busy

`freeBusy.query` is exposed through `getCalendarFreeBusyWithToken` and `getCalendarFreeBusy`. Requests validate the RFC3339 time window, deduplicate calendar identifiers, enforce the Calendar API expansion limit of 50 calendars, and return normalized busy intervals plus per-calendar errors.

Free/Busy uses the dedicated `calendar.freebusy` capability backed by `https://www.googleapis.com/auth/calendar.freebusy`.

### Recurrence semantics

Calendar event normalization now preserves recurrence-aware fields including `recurrence`, `recurringEventId`, and `originalStartTime`. The infrastructure exposes paginated `events.instances` access for recurring series and supports recurring event creation through the existing Calendar write capability using recurrence rules and explicit event time zones.

Existing list operations continue to use `singleEvents=true` so schedule views receive individual occurrences, while instance retrieval remains available when the caller needs the series/exception relationship.

### Calendar selection

Event list, range, single-event, patch, and delete operations now accept an optional calendar identifier while preserving `primary` as the default. Recurrence instance retrieval and event creation also support explicit calendar identifiers.

## Explicitly deferred

`syncToken`, local incremental synchronization, push/watch notifications, agent/tool exposure, and user-facing Calendar workflow changes remain deferred to later passes.

## Verification

The pass includes focused tests for CalendarList pagination and metadata, Free/Busy request construction and validation, recurring instance pagination and identity fields, recurring event creation, and least-privilege authorization scopes.
