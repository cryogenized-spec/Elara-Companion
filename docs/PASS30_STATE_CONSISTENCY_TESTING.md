# Pass 30 — State Consistency Testing

## Objective

Turn the state-ownership work from Passes 24–29 into executable regression guarantees around persistence, reload, migration, interruption/recovery, external authorization state, and derived projections.

## Coverage established or confirmed

### Durable background recovery

`stateConsistency.test.ts` verifies that multiple jobs belonging to the same conversation survive persistence independently, that cleanup removes exactly one `jobId`, and that malformed persisted recovery records are rejected.

This directly protects the Pass 28 race-condition fix.

### Google authorization lifecycle

`stateConsistency.test.ts` verifies that authorization produces a canonical token/expiry state and that expiry transitions the state to disconnected rather than leaving a stale connected flag in memory.

This directly protects the Pass 29 external-state boundary.

### Memory projection authority

`stateConsistency.test.ts` and `memoryEndToEnd.test.ts` verify that normal system-prompt construction can use authoritative memory state without recreating the deprecated localStorage memory mirror.

The existing memory end-to-end test previously asserted the opposite behaviour; Pass 30 corrects that stale test so the suite now enforces the architecture actually established by Pass 27.

### Workspace persistence / reload

`src/lib/__tests__/workspaceStorage.test.ts` already verifies save -> reload behaviour, malformed storage recovery, normalization, dangling active-artifact repair, and protection against setting an unknown artifact active.

### Legacy migration

`src/lib/__tests__/voiceSettingsCanonical.test.ts` already verifies that canonical `voiceSettings` takes precedence over legacy flat speech fields and that missing voice settings normalize to canonical defaults.

### Runtime/persistence interruption model

The background recovery tests model the persisted-job layer as the restart boundary: jobs remain in local persistence until terminal reconciliation removes the exact execution record. UI lifecycle is not permitted to be the persistence authority.

## Testing principle

These tests assert domain and boundary invariants rather than internal implementation details. A refactor that preserves the contract should keep the tests green even if the underlying modules are rearranged.

## Known verification constraint

The repository's broader `lint` pipeline still includes the existing Lockbox audit gate. Historical failures in that gate concern direct `process.env` access in infrastructure/build files and are tracked separately from this state-consistency work. Pass 30 must not treat a Lockbox audit failure as evidence that these state invariants are wrong, nor should future work silently normalize the application around a broken verification baseline.
