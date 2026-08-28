# Pass 17 — Integration & Runtime Proving

## Objective

Prove the repository as a whole with executed repository commands, background-runtime checks, an application startup smoke test, and a capability evidence ledger. A test is counted as evidence only when the CI runner executes it.

## Executed commands

The Pass 17 proving workflow runs these commands directly, in addition to the repository's existing production verifier:

```bash
npm test
npm run lint
npm run build
npm run verify:production
npm --prefix background-runtime ci --no-audit --no-fund
npm --prefix background-runtime run typecheck
```

It also starts the built server with `node dist/server.mjs`, waits for the HTTP listener, and verifies the application responds successfully before terminating it.

## Runtime/application evidence

The existing executable test suite provides repository-level evidence for the Google runtime and state transitions, including:

- Google identity authorization lifecycle and expiry/invalid-state handling.
- Incremental capability authorization and capability-state classification.
- Gmail read/send/write confirmation policy.
- Calendar read/write contract and explicit-token infrastructure.
- Workspace artifact operations, persistence, synchronization, and background reconciliation.
- Google Hub capability registry, module registry, activity/context, and authorization state.
- Reliability/retry/failover behavior and network failure classification.
- Application event handling and persistence boundaries.

The workflow also performs a fresh-process application startup/HTTP smoke test after build output is produced.

## Required manual/live-provider matrix

Some acceptance cases require a real browser session, real Google credentials/scopes, and live provider data. This repository execution environment does not expose an interactive browser or a real Google account session, so these cases are recorded as **manual/live-provider required**, not falsely marked green:

| Scenario | Evidence status | Reason |
|---|---|---|
| Fresh load | automated smoke test | Built server responds successfully from a fresh process |
| Browser desktop layout | manual/live-provider required | No interactive browser harness is available in the runner |
| Browser mobile layout | manual/live-provider required | No interactive browser/viewport harness is available |
| Existing Google authorization | automated contract + manual/live-provider | Requires persisted real OAuth session for end-to-end UI proof |
| Google authorization from zero | automated contract + manual/live-provider | Requires browser OAuth consent flow |
| Partial authorization | automated contract + manual/live-provider | Real scope grant/revocation requires Google account |
| Capability enablement | automated contract + manual/live-provider | Real incremental authorization required |
| Capability disable/revoke | automated contract + manual/live-provider | Real OAuth revocation required |
| Gmail read flow | automated service tests + manual/live-provider | Live mailbox required |
| Gmail send gating | automated authorization policy + manual/live-provider | Real send action requires account/provider |
| Calendar read/create | automated service/contract tests + manual/live-provider | Live calendar required |
| Tasks create/complete | automated service tests + manual/live-provider | Live Tasks account required |
| Drive search/upload/inspect | automated service/contract coverage + manual/live-provider | Live Drive data required |
| Docs create/update | automated capability/write-policy coverage + manual/live-provider | Live Docs required |
| Sheets read/write | automated capability/write-policy coverage + manual/live-provider | Live Sheets required |
| Keep create/delete/pin | automated capability/service coverage where present + manual/live-provider | Live provider data required for end-to-end UI proof |
| Contacts search | automated capability/service coverage + manual/live-provider | Live Contacts required |
| Chat read/send/manage | automated capability/service coverage + manual/live-provider | Live Chat spaces required |
| Activity persistence | automated repository tests | Durable activity/event behavior is executable in tests |
| Ask Elara | automated runtime/tool-context coverage + manual/live-provider | Live Google context is required for provider-backed proof |
| Browser refresh | automated persistence coverage + manual/live-provider | Browser session required for UI-level refresh proof |
| Expired/invalid authorization | automated authorization lifecycle tests + manual/live-provider | Live expired token path requires provider session |
| Network/API failure | automated retry/failure classification tests | Executed by the repository test suite |

## Hard rule

A green Pass 17 result means the listed commands actually ran and passed. It does not convert manual/live-provider scenarios into automated evidence. Those remain explicitly identified until an interactive browser/provider harness is available.
