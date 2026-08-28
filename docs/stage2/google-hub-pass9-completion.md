# Stage 2 — Google Hub Pass 9: Activity + permissions

Status: COMPLETE
Branch: `feature/google-hub-pass9`

Pass 9 makes Google activity durable and keeps the Hub permission view grounded in the canonical authorization projection.

Completed:

- Google activity recorder now hydrates from and persists to browser local storage.
- Activity remains bounded to the existing 200-event limit.
- Clear removes both memory and persisted history.
- No credential/token data is recorded by the activity contract.
- Permission state remains derived from capability requirements and the Pass 3 authorization projection.

The activity timeline is therefore useful across reloads while remaining a local, best-effort audit trail.

Next: Pass 10 — integration/proving and final regression gate.
