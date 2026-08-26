# Pass 47 — Google Calendar Capability Adapter

## Objective

Begin Google provider decomposition by extracting Calendar from the monolithic `googleApi.ts` into a capability-aware service without changing unrelated Google systems.

## What changed

`src/services/googleCalendarService.ts` now owns Calendar read/create operations and the Google REST transport for that capability.

Authorization is resolved through the canonical `googleWorkspaceService.googleIdentity` boundary. The adapter requests only `calendar.read` or `calendar.write` capability scopes when required.

Focused tests verify capability selection, token use, REST routing, and response normalization.

## Architectural result

The new preferred path is:

`feature/UI/tool → googleCalendarService → Google identity/capability boundary → Calendar API`

The monolithic `src/lib/googleApi.ts` remains intact for the other Google capabilities. This is deliberate: the extraction is being performed capability-by-capability rather than replacing the entire provider in one pass.

## Caller migration

The existing Settings surface still imports Calendar functions from `googleApi.ts`. This pass proves the replacement adapter in isolation before redirecting the large Settings module. The next bounded Google pass should migrate the remaining Calendar callers and then remove the duplicated Calendar implementation from `googleApi.ts`.

## Invariants

- `googleIdentity` remains the only credential authority.
- Calendar capability scope selection is centralized in `googleCapabilityPolicy`.
- No new OAuth/token implementation is permitted inside capability adapters.
- `googleApi.ts` is not deleted until all Calendar callers are migrated and regression-tested.

## Verification target

```text
npm install
npm run lint
npm test
npm run build
npm run benchmark:memory
```

## Handoff to next Google pass

Migrate Settings and any remaining Calendar callers to `googleCalendarService`, then physically remove the Calendar functions and duplicate Calendar scope usage from `googleApi.ts` once verification is green.

Legacy production/reference repository remains untouched.
