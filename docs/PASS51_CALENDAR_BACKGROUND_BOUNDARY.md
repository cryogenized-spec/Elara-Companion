# Pass 51 — Calendar Background Boundary

## Objective

Remove the separate Calendar REST implementation from the Cloudflare Worker without making the Worker depend on browser authentication or the React application layer.

## What changed

`src/infrastructure/googleCalendarApi.ts` is now the pure Calendar infrastructure adapter. It accepts an explicit access token and owns Calendar REST mechanics, normalization, range validation, and HTTP error handling.

`src/services/googleCalendarService.ts` remains the canonical application service. It owns browser authorization/capability policy and delegates the actual HTTP work to the shared infrastructure adapter. Explicit-token callers may also use the same service path.

`background-runtime/src/googleTools.ts` now delegates `list_google_calendar_events` to `getUpcomingCalendarEventsWithToken()` and no longer contains a direct Calendar REST URL or a second Calendar implementation.

The first verification run caught two strict-TypeScript `Response.json()` payloads in the shared infrastructure and they were corrected with explicit external-payload typing. No architectural weakening was required.

## Dependency direction

Browser/UI:

`UI -> GoogleCalendarContract -> googleCalendarService -> googleCalendarApi infrastructure -> Google Calendar API`

Background runtime:

`Worker tool -> googleCalendarApi infrastructure -> Google Calendar API`

The Worker does not import browser OAuth state, React state, or `googleWorkspaceService`.

## Regression protection

`src/services/__tests__/googleCalendarInfrastructure.test.ts` verifies:

- explicit-token reads
- range normalization and validation
- explicit-token writes
- no network call for invalid ranges
- the Worker contains no direct Calendar REST endpoint

## Verification state

The repository's old `.github/workflows/pass46-verification.yml` also fired on this branch after the typing fix but reported a failure with zero jobs, so that result is treated as stale/misconfigured workflow plumbing rather than a code failure. The current PR remains mergeable, but the exact corrected head must still receive a meaningful CI/verifier result before merge.

## Remaining Calendar legacy work

`src/lib/googleApi.ts` still contains the historical `CalendarEventItem`, `getUpcomingCalendarEvents`, and `createCalendarEvent` implementation.

`src/components/SettingsModal.tsx` still imports the legacy Calendar functions from `googleApi.ts` and must be migrated before those exports can be deleted.

## Handoff

Next pass should migrate the intact Settings Calendar caller to `GoogleCalendarContract` or the canonical Calendar service. Once no code search result references the legacy Calendar exports, remove only the Calendar portion of `googleApi.ts` and add a regression guard that prevents Calendar imports from the legacy module.

Legacy production/reference repository remains untouched.
