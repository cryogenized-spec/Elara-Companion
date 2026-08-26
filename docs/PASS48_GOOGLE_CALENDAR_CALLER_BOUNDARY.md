# Pass 48 — Google Calendar Caller Boundary

## Objective

Move Calendar application consumption toward the canonical capability boundary without reconstructing or rewriting the large historical Settings surface through a partial source view.

## What changed

A dedicated `GoogleCalendarContract` was added to `src/contracts/index.ts` with two application-facing operations:

- `getUpcoming`
- `create`

`src/contracts/implementations.ts` now exposes `googleCalendarContract`, delegating directly to `googleCalendarService`.

The existing Google identity contract remains responsible only for authorization/token state, while the Calendar service remains responsible for Calendar capability authorization and REST interaction.

## Architectural result

The intended caller direction is now:

`UI / feature / tool → GoogleCalendarContract → googleCalendarService → googleWorkspaceService.googleIdentity + googleCapabilities → Google Calendar API`

This prevents future Calendar callers from importing the monolithic `googleApi.ts` implementation.

## Remaining legacy caller

Repository search still identifies the historical `src/components/SettingsModal.tsx` as a direct consumer of `getUpcomingCalendarEvents` from `googleApi.ts`. That component also consumes many unrelated Google operations and is deliberately not reconstructed or broadly rewritten in this pass.

Pass 49 should migrate the Settings Calendar call through `googleCalendarContract` using an intact source edit, then remove the duplicate Calendar functions from `googleApi.ts` once no callers remain.

## Verification target

Run:

```text
npm install
npm run lint
npm test
npm run build
npm run benchmark:memory
```

Legacy production/reference repository remains untouched.
