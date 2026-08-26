# Pass 53 — Calendar Settings Cut Map

## Objective

Finish the precondition work for removing Calendar from the historical `googleApi` surface without modifying the large Settings component through an unsafe partial-file rewrite.

## Verified state

The canonical path is now:

`Settings -> GoogleCalendarContract -> googleCalendarService -> googleCalendarApi`

The background path is:

`Worker tool -> googleCalendarApi -> Google Calendar API`

The old Calendar implementation remains only in `src/lib/googleApi.ts`, and the remaining external consumer is `src/components/SettingsModal.tsx`.

## Remaining Settings Google coupling

`SettingsModal.tsx` currently consumes the Google provider for multiple independent concerns. Calendar-specific usage is limited to:

- `getUpcomingCalendarEvents(15)` in `handleManualCalendarSync`
- `CalendarEventItem` for `calendarSyncResult` and calendar rendering
- the shared Google connection helpers (`requestGoogleAuth`, `isGoogleConnected`) remain separate concerns and must not be changed as part of the Calendar cut

The Settings file also contains a Google Chat schedule-sweep path that calls `getUpcomingCalendarEvents(5)`. This is another Calendar consumer inside the same Settings module and must migrate to the canonical Calendar service/contract before the legacy Calendar exports can be deleted.

## Internal legacy compatibility

`src/lib/googleApi.ts` still has `executeWorkspaceTool('get_calendar_events')`, which is an internal compatibility route. It must either be removed or redirected to the canonical Calendar contract as part of the final deletion sequence.

## Cut sequence

1. Change Settings Calendar imports to `googleCalendarContract` (or a Settings-owned application service that delegates to it).
2. Replace both Calendar call sites in Settings: manual sync and schedule-sweep card generation.
3. Replace the Calendar event type with the canonical `GoogleCalendarEvent` contract type.
4. Redirect or remove `executeWorkspaceTool('get_calendar_events')`.
5. Search the repository for `getUpcomingCalendarEvents`, `createCalendarEvent`, and `CalendarEventItem`.
6. When the only remaining hits are canonical service/infrastructure/tests, remove the Calendar implementation from `googleApi.ts`.
7. Invert the Pass 52 deletion gate so any future Calendar import from `googleApi` fails CI.

## Important constraint

The current GitHub file-write interface requires complete replacement contents for large files. The environment cannot clone GitHub directly because outbound DNS is unavailable. Do not reconstruct `SettingsModal.tsx` or `googleApi.ts` from truncated tool output. Perform the final large-file migration only when the full source can be safely materialized and edited.

## Handoff

The next pass should be the actual Settings migration. Do not create another generic Calendar abstraction. The architecture is already sufficient; the remaining work is caller migration and physical deletion.

Legacy production/reference repository remains untouched.
