# Elara Google Hub — Final State Lock

**Status:** Canonical architectural and completion guard for the Google Hub workstream.

**Scope:** Passes 1–19 of the Google Hub programme.

**Authority:** This document describes the repository state and rules that future Google integration work must preserve. Earlier completion notes remain historical evidence; this document is the canonical forward-looking contract.

## 1. Final architecture

The required architecture is:

```text
Google account / OAuth
        ↓
canonical Google authorization provider
        ↓
token-free Google Hub authorization snapshot
        ↓
Google Hub shell
        ↓
registered capability module registry
        ↓
capability-owned panels/actions/context
        ↓
canonical Google provider services
```

Cross-cutting services sit alongside this path where appropriate:

```text
Google capability operations
        ├── permission/state projection
        ├── structured Elara context
        └── activity/audit trail
```

The Hub is an orchestration/presentation boundary. It must not own Google API implementation details, access tokens, duplicate OAuth state, or service-specific business logic.

There is one user-facing Google UI system: **Google Hub**. The ordinary Settings surface must not become a second Google Workspace console.

## 2. Capability registry rules

The registry is the authoritative list of available Google capabilities.

A capability descriptor must declare, at minimum:

- stable capability id
- user-facing name
- description/category/icon metadata
- base capability requirements
- action-level requirements where applicable
- user-facing permission explanation
- data-access explanation
- external provider URL where appropriate
- panel/module key
- complete action set

The registered module layer owns the capability's UI implementation and integration behaviour.

The core Hub renderer must remain provider-neutral. It may enumerate registered capabilities and invoke their module contracts, but it must not contain service-specific `if`, `switch`, or provider API branches.

Registration must reject malformed descriptors, duplicate capability ids, duplicate action ids, unknown action-requirement keys, and equivalent registry integrity failures.

A new provider/capability must be addable without modifying the core Hub renderer.

### Mandatory architectural rule

**A new Google capability must be implemented as a registered module and must not require modification of the core Hub renderer.**

## 3. Permission semantics

Account identity and capability/action authorization are separate concerns.

The canonical states are:

- `unauthorized` — no valid Google identity authorization.
- `partially-authorized` — Google identity is valid but one or more required capability permissions are missing.
- `authorized` — the identity and currently required capability permissions are fully satisfied.

At capability level, the user-visible semantic states are:

- **Ready** — all required permissions for the capability's operational actions are present.
- **Limited** — the capability is accessible, but one or more consequential/optional actions lack their required permissions.
- **Needs access** — the account is connected but required base access is missing.
- **Unavailable** — the Google account is not connected/authorized.

Action requirements are evaluated using **all** declared requirements, never “any matching requirement”.

Actions that merely navigate or ask Elara do not require provider data scopes unless explicitly declared.

Optional write/send/manage permissions must remain distinct from read access.

The UI, capability state projector, permissions surface, and agent context must all derive from the same canonical state model. No layer may silently reimplement different permission semantics.

The current OAuth architecture uses a shared Google token. Revocation therefore means account-wide Google access revocation unless the provider/auth design is explicitly changed in a future architectural pass.

The Hub and agent context must never receive or store access tokens, refresh tokens, client secrets, or equivalent credentials.

## 4. AI context contract

`GoogleHubContext` is a structured, credential-free context envelope for Elara.

Where applicable it may include:

- authenticated Google account identity/email
- Google authorization state
- granted capability state
- missing capability state
- action-level availability
- enabled/blocked action labels
- active capability
- selected safe Google resource metadata
- bounded safe excerpts
- relevant recent activity
- safety/confirmation requirements

It must not contain:

- access tokens
- refresh tokens
- OAuth client secrets
- arbitrary provider credential objects
- uncontrolled application state dumps

The agent must consume the canonical capability-state projector rather than inventing its own permission model.

“Ask Elara” is a context-aware entry point into the normal Elara chat route. A button that merely inserts a generic prompt is not sufficient to claim rich Google context integration.

## 5. Activity contract

Google operations that materially interact with provider data or state should create an activity event through the canonical activity service.

An activity event contains, as applicable:

- capability/service
- canonical action
- timestamp
- human-readable description
- reversibility metadata
- external/consequential metadata
- optional sanitized resource reference

Events must preserve operation meaning. Examples:

- Read Gmail
- Created Gmail draft
- Sent Gmail message
- Created Calendar event
- Updated Google Doc
- Uploaded Drive file
- Completed Google Task

Generic entries such as `Used Google` are not an acceptable substitute when the actual operation is known.

Activity persistence is expected across application reload where the product promises persistence, with bounded retention.

Activity records must never contain provider credentials or secrets.

## 6. User-facing entry point

The user-facing route for Google is:

```text
Settings / application navigation
        ↓
Google Hub
```

The Hub exposes four primary areas:

- **Account** — Google identity and overall connection state.
- **Services** — available Google capabilities and their current action-level state.
- **Activity** — recent Elara Google operations.
- **Permissions** — what Elara can access, why it needs access, what actions depend on it, and the actual revocation boundary.

Capability detail views are opened from Services and remain owned by their registered modules.

## 7. Canonical modules and files

The following are canonical architectural surfaces for the Google Hub workstream:

- `src/contracts/googleHub.ts` — Google Hub contracts.
- `src/services/googleCapabilityRegistry.ts` — authoritative capability descriptors/registry.
- Google capability module registry/factory — authoritative module composition seam.
- `src/services/googleHubAuthorizationService.ts` — canonical authorization projection.
- `src/services/googleHubCapabilityState.ts` — canonical capability/action state projection.
- `src/services/googleHubContextService.ts` — structured Elara context.
- `src/services/googleActivityService.ts` — activity/audit trail.
- `src/components/google/GoogleHub.tsx` — Hub presentation/orchestration shell.
- `src/components/google/GoogleHubModal.tsx` — application-level Hub container.
- `src/components/google/*CapabilityPanel.tsx` — capability-owned UI modules.
- canonical provider services such as `googleGmailService.ts`, `googleCalendarService.ts`, `googleTasksService.ts`, Drive/Docs/Sheets/Keep/Contacts/Chat services, and the canonical Google API/auth infrastructure.

The exact module list may expand over time, but ownership must continue to follow these boundaries.

## 8. Forbidden future Google UI / anti-patterns

Do not reintroduce any of the following as a user-facing Google system:

- a second Google Workspace tab inside Settings
- a new monolithic Google settings component
- service-specific rendering switches inside the core Hub renderer
- direct Google API calls from the Hub shell
- duplicate Google OAuth/token state owned by UI components
- capability availability booleans computed independently by multiple layers
- generic activity logging that hides the real operation
- fake permission/revocation controls that do not match the OAuth architecture
- UI-only “Ask Elara” prompts with no structured Google context
- a new parallel Google registry
- a legacy compatibility component exposed as a Google navigation surface

Dead code is not a valid substitute for migration. If a legacy implementation is no longer canonical, future work should migrate consumers and remove/quarantine the obsolete path rather than keep two active systems.

## 9. Test and verification commands

The repository's standard proving commands are:

```bash
npm test
npm run lint
npm run build
npm run verify:production
npm --prefix background-runtime ci --no-audit --no-fund
npm --prefix background-runtime run typecheck
```

The production proving workflow should also start the built application and perform a fresh-process HTTP smoke test.

A test suite that exists but has not executed is not verification.

A build that merely appears likely to compile is not verification.

A pull request being mergeable is not verification.

## 10. Final verification evidence

The Pass 17 proving workflow executed the required repository commands and background-runtime checks on a dependency-backed GitHub Actions runner. The final clean run passed:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run verify:production`
- background-runtime dependency installation
- background-runtime typecheck
- built application startup/HTTP smoke test

The then-current repository test suite passed **280/280** tests during the clean proving run.

The proving workflow also exposed and required correction of a real production dependency defect (`express` was missing from runtime dependencies); the dependency was added before the final green run. This is retained as evidence of the value of the proving gate.

Live Google/browser scenarios are a separate verification class. They require a real browser session and authenticated Google account and therefore are not silently converted into green CI evidence.

## 11. Known limitations

The canonical repository proving can establish build, typecheck, lint, unit/integration behaviour, background-runtime health, and production-server startup, but it cannot substitute for live Google/provider/browser acceptance when those require real external state.

In particular, the following may require manual/provider-backed confirmation in a real deployed app:

- real OAuth consent from zero
- persisted real Google authorization
- real partial scope grants/revocation
- live Gmail/Calendar/Tasks/Drive/Docs/Sheets/Keep/Contacts/Chat operations
- desktop/mobile visual inspection
- browser refresh with a real provider session

These are known verification boundaries, not permission to claim them as tested when they have not been tested.

## 12. Extension procedure for a new Google capability

To add a new capability such as Google Meet:

1. Define the capability descriptor and stable id.
2. Declare base permissions and every action's requirements explicitly.
3. Add the provider/service implementation in the canonical Google service layer.
4. Implement the capability's registered module/panel.
5. Register the module in the module registry.
6. Add user-facing permission and data-access explanations.
7. Add action-level state/permission tests.
8. Add service/provider tests for the actual operations.
9. Add activity events for meaningful operations.
10. Add structured Elara context where the capability has useful selected-resource or action state.
11. Add/extend the acceptance matrix so every promised user-facing action is explicit.
12. Run the full proving commands and inspect the built application.
13. Update the relevant durable pass/completion documentation.

Do **not** modify the core Hub renderer merely to teach it how the new capability works.

## 13. Completion rule

**No capability may be marked complete solely because its service/API implementation exists. Completion requires user-facing integration and verification.**

A capability is complete only when its promised behaviour is:

- implemented
- registered
- reachable from the intended user flow
- permission-gated truthfully
- represented correctly in agent context where applicable
- represented correctly in activity where applicable
- covered by executable tests
- verified by the repository proving pipeline
- reconciled against its explicit acceptance criteria

If a requirement cannot be executed because it depends on a real external provider/browser, it must be marked **BLOCKED — explicit reason**, never silently treated as verified.

## 14. Change-control rule

Any future Google integration PR should identify which part of this document it affects.

If a proposed change requires violating one of the architectural invariants above, stop and make that architectural change an explicit, separately reviewed decision. Do not silently bypass the lock because the shortcut is faster.

The preferred outcome is a boring extension path, predictable verification, and one authoritative Google system.
