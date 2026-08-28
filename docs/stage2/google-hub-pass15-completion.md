# Google Hub — Pass 15 Completion

## Objective

Make Activity a genuine audit trail rather than a log-shaped UI. Meaningful Google operations must remain distinguishable, accountable, reload-safe where persistence is intended, and credential-free.

## Requirements ledger

### Required now
- [x] Each meaningful Google activity event carries capability, action, timestamp, and human-readable description.
- [x] Events carry reversible, external, and consequential flags.
- [x] Optional resource references contain only safe type/id/url metadata.
- [x] Distinct operations remain distinguishable in event descriptions and canonical action classes.
- [x] Gmail read/draft/send, Calendar read/create, Docs update, Drive upload/read, Tasks completion, Keep operations, and other panel activity descriptions flow through the canonical activity recorder.
- [x] Successful agent Google tool executions independently create activity events from the tool/result boundary.
- [x] Activity survives application reload through browser localStorage when available.
- [x] Activity retention remains bounded to 200 events.
- [x] Credential-shaped fields and sensitive URL query parameters are removed before activity persistence.
- [x] Google Hub Activity UI uses friendly Google service names instead of internal capability IDs.

### Required for verification
- [x] Representative activity action distinctions are covered by unit tests.
- [x] Persistence across recorder recreation is covered by tests.
- [x] Credential/token scrubbing is covered by tests.
- [x] Bounded retention is covered by tests.
- [x] Resource reference sanitization is covered by tests.
- [x] Agent-tool activity auditing is covered by tests.
- [x] Dependency-backed production CI completed successfully on the action-fidelity revision.

## Architecture

Google capability panels and agent tool execution both feed the canonical Google activity recorder.

Panel/user flow:

Google capability operation
→ descriptive activity callback
→ canonical action inference
→ sanitized GoogleActivityEvent
→ bounded persistent recorder
→ Google Hub Activity UI

Agent flow:

Google agent tool success
→ operation/tool mapping
→ safe resource extraction
→ sanitized GoogleActivityEvent
→ bounded persistent recorder

The activity recorder never accepts or persists OAuth access tokens, secrets, or credential objects.

## Files changed in Pass 15

- `src/contracts/googleActivity.ts`
- `src/services/googleActivityService.ts`
- `src/services/googleActivityService.test.ts`
- `src/services/googleHubIntegration.test.ts`
- `src/services/agentToolExecutionService.ts`
- `src/components/google/googleCapabilityModules.tsx`
- `src/components/google/GoogleHubModal.tsx`
- `docs/stage2/google-hub-pass15-completion.md`

## Safety and accountability boundary

Activity is descriptive audit data, not an authorization mechanism. External/consequential flags communicate the nature of an operation; execution remains behind the existing Google authorization and confirmation policies. Resource references are sanitized before storage, and activity text is scrubbed for credential-shaped material.

## Verification status

Dependency-backed GitHub Actions production verification passed on the final action-fidelity revision before this completion record was added. The completion-record commit itself must receive its own CI pass before Pass 15 is merged.

## Definition of done

Pass 15 is complete when this ledger remains checked and the exact final branch head passes the dependency-backed production verification gate, after which the Pass 15 pull request may be merged.
