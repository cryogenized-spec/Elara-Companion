# Calendar Pass 6 — Final hardening and workflow closure

## Result

Pass 6 is the final Google Calendar hardening pass. The Calendar capability now has a complete application-facing workflow and machine-checked architectural boundaries.

## Final runtime shape

Browser Calendar UI:

`CalendarCapabilityPanel -> googleCalendarService -> googleCalendarApi`

Durable browser synchronization:

`CalendarCapabilityPanel -> googleCalendarSyncService -> googleCalendarService -> googleCalendarApi -> Calendar sync storage`

Background push path:

`Google Calendar events.watch -> HTTPS notifications -> googleCalendarPush -> verified change signal -> authoritative syncGoogleCalendar`

Agent path:

`Agent tools -> canonical Calendar service/sync service`

## Final locks

- `src/lib/googleApi.ts` contains no Calendar exports or `get_calendar_events` compatibility route.
- UI source contains no legacy Calendar consumer.
- Calendar REST URLs are restricted to `googleCalendarApi.ts` and `googleCalendarWatchApi.ts`.
- Push notifications remain hints only; the push receiver never writes durable event snapshots.
- Calendar write operations remain confirmation-gated.
- Calendar watch channel tokens are never returned by channel-status responses.

## User-facing workflow

The Google Hub Calendar panel now exposes `Sync now` in addition to event inspection, availability lookup, creation, and the existing Google Calendar handoff. The sync control uses the durable sync service and reports the stored local sync state after completion.

## Push/watch lifecycle

Watch creation and stopping remain background control-plane operations because the webhook address and bearer token belong to the deployed Worker boundary. The UI does not embed the background Worker credential. Push notifications trigger no direct client-state mutation; a subsequent sync remains authoritative because Google documents that notifications do not carry event details and may be dropped.

## Verification

Pass 6 adds `calendarFinalArchitectureLock.test.ts`, which makes the final invariants executable in CI rather than relying on historical documentation or manual repository searches.

Previous Calendar passes remain intact:

1. canonicalization and legacy purge
2. complete event CRUD and pagination
3. discovery, Free/Busy, and recurrence semantics
4. durable incremental sync and 410 recovery
5. push/watch transport, webhook verification, and agent exposure
6. final hardening and user-facing sync workflow
