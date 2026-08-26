# Pass 52 — Google Calendar Legacy Deletion Gate

## Objective

Turn the remaining Calendar legacy surface into an explicit, machine-checked deletion target rather than allowing the old provider implementation to linger unnoticed.

## Current inventory

The remaining legacy Calendar implementation is confined to two places:

1. `src/components/SettingsModal.tsx` still imports `getUpcomingCalendarEvents` and `CalendarEventItem` from `src/lib/googleApi.ts`.
2. `src/lib/googleApi.ts` itself still contains the historical Calendar functions and its `executeWorkspaceTool('get_calendar_events')` compatibility route.

The browser Calendar service, contract, and background runtime no longer depend on the legacy Calendar implementation.

## Why deletion is not yet claimed

The GitHub connector's large-file write path only accepts full-file replacement. The intact `SettingsModal.tsx` and `googleApi.ts` sources are substantially larger than the safe connector write surface, so this pass establishes the deletion invariant rather than reconstructing either file from partial output.

No guessed or partial rewrite has been applied.

## Regression gate

`src/services/__tests__/googleCalendarLegacyInventory.test.ts` proves:

- the remaining legacy Calendar implementation is limited to the known Settings/compatibility surfaces;
- the canonical Calendar service does not import the legacy provider;
- the canonical Calendar contract is backed by the new service.

Once Settings is migrated, the same test should be inverted so that direct legacy Calendar imports/exports cause failure.

## Handoff

Next pass should perform the actual Settings import migration and then remove the Calendar block plus `get_calendar_events` compatibility route from `googleApi.ts` in one controlled change. After deletion, invert the regression test to assert zero legacy Calendar consumers.

Legacy production/reference repository remains untouched.
