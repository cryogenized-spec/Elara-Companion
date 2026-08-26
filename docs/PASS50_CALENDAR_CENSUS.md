# Pass 50 — Google Calendar Dependency Census

## Purpose

Establish the complete remaining Calendar dependency map before physically deleting the historical Calendar implementation. This pass is documentation-only; no runtime behavior changes are introduced.

## Canonical implementation

`src/services/googleCalendarService.ts` is the authoritative Calendar implementation. It owns upcoming-event reads, ranged reads, event creation, event normalization, capability checks, and explicit-token execution for non-browser callers.

`src/contracts/index.ts` defines the stable `GoogleCalendarContract` application boundary, and `src/contracts/implementations.ts` binds that contract to the canonical Calendar service.

## Remaining legacy / migratable surfaces

### 1. `src/components/SettingsModal.tsx`

Classification: **LIVE LEGACY CALLER — MIGRATE**.

The Settings surface still imports `getUpcomingCalendarEvents` from `src/lib/googleApi.ts` and directly invokes it from its manual Calendar sync handler. The component also imports `CalendarEventItem` from the same legacy module.

Required action: migrate the caller to `GoogleCalendarContract` / canonical Calendar service without reconstructing the entire Settings component. The migration must preserve the existing UI state and result shape.

### 2. `src/lib/googleApi.ts`

Classification: **LEGACY IMPLEMENTATION — DELETE CALENDAR SURFACE AFTER CALLER MIGRATION**.

The file still contains the historical `CalendarEventItem` type plus direct Calendar REST implementations for `getUpcomingCalendarEvents` and `createCalendarEvent`. These are now duplicate implementations because the same responsibilities live in `src/services/googleCalendarService.ts`.

Required action: after proving no consumers remain, remove only the Calendar exports/implementation from this monolith. Do not delete unrelated Google functionality in the same pass.

### 3. `background-runtime/src/googleTools.ts`

Classification: **SECOND LEGACY IMPLEMENTATION — MIGRATE NEXT**.

The durable background Google tool `list_google_calendar_events` still performs direct Calendar REST requests through its local `googleFetch()` helper. It is not a caller of the canonical Calendar service yet.

Required action: migrate this tool to the canonical Calendar service with its explicit background access token preserved. This must not introduce browser OAuth dependencies into the background runtime.

## Canonical / non-legacy Calendar policy surfaces

`src/services/googleCalendarService.ts`, `src/contracts/index.ts`, `src/contracts/implementations.ts`, `src/lib/googleCapabilityPolicy.ts`, `docs/GOOGLE_SCOPE_POLICY.md`, and `config/google-scope-policy.json` are retained as architectural support surfaces. The `calendar.read` and `calendar.write` capabilities remain intentional and should not be collapsed back into a broad Google API surface.

## Search findings

Code search for `getUpcomingCalendarEvents` returns only `googleApi.ts` and `SettingsModal.tsx`.

Code search for `CalendarEventItem` returns the canonical Calendar service, `googleApi.ts`, and `SettingsModal.tsx`.

Code search for direct `calendar/v3` requests still identifies `googleApi.ts`, `background-runtime/src/googleTools.ts`, and the canonical Calendar service.

Code search for `createCalendarEvent` identifies the remaining historical implementation in `googleApi.ts`; the canonical service owns the new implementation.

Code search for `list_google_calendar_events` identifies `background-runtime/src/googleTools.ts` as the remaining durable background Calendar tool implementation.

## Deletion gate

`src/lib/googleApi.ts` Calendar code is **not yet safe to delete** until both remaining live callers are migrated:

1. Settings manual Calendar sync.
2. Background durable Calendar read tool.

After those migrations, run a repository-wide search for the Calendar symbols and direct Calendar REST URL. The intended final result is exactly one implementation boundary: `googleCalendarService.ts`.

## Handoff

Pass 51 should migrate `background-runtime/src/googleTools.ts` or the intact Settings caller, whichever can be completed without reconstructing a large file from partial source. The pass should end with another search proving whether any legacy Calendar consumers remain.

Legacy production/reference repository remains untouched.
