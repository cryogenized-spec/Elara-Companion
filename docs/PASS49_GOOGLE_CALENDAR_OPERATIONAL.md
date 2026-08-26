# Pass 49 — Google Calendar Operational Tool Delegation

## Objective
Remove the duplicate Google Calendar REST implementation from the operational agent tool and make the canonical Calendar service the sole Calendar implementation boundary for both UI and explicit-token tool execution.

## What changed

`src/services/googleCalendarService.ts` now supports an explicit access token in addition to canonical browser identity state. This preserves the background/tool execution path without introducing another credential authority.

`src/services/googleCalendarService.ts` also owns ranged Calendar reads, including date normalization and event normalization.

`src/lib/googleAgentOperationalTools.ts` no longer performs Calendar REST requests itself. `get_calendar_events_range` and `create_calendar_event` delegate to the canonical Calendar service.

Focused regression coverage proves both operational Calendar commands still work with an explicit token and that the Calendar REST boundary remains behind the service.

## Architectural result

The Calendar implementation direction is now:

`UI / Settings / operational tools -> GoogleCalendarContract / Google Calendar service -> Google identity or explicit execution token -> Google Calendar API`

No second OAuth/token store was introduced.

## Deliberately deferred

- migration of the historical SettingsModal Calendar caller
- physical deletion of the Calendar exports from `googleApi.ts`
- other Google capability decomposition

Those remain bounded follow-up work and require proof that no consumers remain before deletion.

## Verification

Pending Pass 49 verification.

## Handoff

Next pass should inventory all remaining Calendar references and, once the Settings caller can be safely edited from intact source, migrate it to the Calendar contract/service. Then remove the obsolete Calendar implementation from `googleApi.ts` and add a regression guard preventing direct Calendar imports from returning.

Legacy production/reference repository remains untouched.
