# Google Hub — Pass 11 Completion

## Objective

Pass 11 locks the canonical Google Hub architecture so capability behavior is registry/module driven rather than embedded in the Hub shell.

## Requirements and acceptance

### Canonical contract
- [x] Google Hub capability IDs are runtime-extensible rather than a closed list of current products.
- [x] Registry remains the authoritative source of descriptors.
- [x] Descriptor validation rejects empty IDs/names/panel keys.
- [x] Descriptor validation rejects duplicate action IDs.
- [x] Descriptor validation rejects action requirements that reference undeclared actions.

### Module architecture
- [x] Hub shell contains no provider API imports.
- [x] Hub shell does not contain service-specific `if`/`switch` rendering logic.
- [x] Capability panel behavior is registered in a dedicated module registry.
- [x] Module registry rejects duplicate module registrations.
- [x] Missing module registration fails explicitly rather than silently rendering an empty panel.
- [x] A future capability module can be registered and rendered in isolation without changing the Hub shell.

### Integration rules
- [x] Provider-specific API execution remains outside the Hub.
- [x] Authorization state remains UI-safe and credential-free.
- [x] Existing nine Google capabilities remain registered through the module registry.
- [x] The application can continue consuming `createGoogleCapabilityModules()` without knowing provider internals.

## Files changed in Pass 11

- `src/contracts/googleHub.ts`
  - Google Hub capability IDs are runtime-extensible.
- `src/services/googleCapabilityRegistry.ts`
  - Added descriptor integrity validation at registration time.
- `src/components/google/googleCapabilityModules.tsx`
  - Replaced the static panel-factory record with an explicit module registry.
- `src/services/googleCapabilityRegistry.test.ts`
  - Added future-capability, future-module, duplicate-registration, and malformed-descriptor proving tests.

## Verification status

Source-level verification completed against the current branch.

The repository has not produced a successful local/CI TypeScript, lint, test, or build result in this environment because dependency-backed execution is unavailable. Therefore those checks remain `NOT EXECUTED`, not `PASS`.

## Canonical architectural invariant

`Google OAuth/provider -> canonical authorization projection -> Google Hub -> capability registry -> registered capability module -> provider service`

The Hub must not become an API execution layer and must not accumulate per-provider rendering branches.

## Extension procedure

To add a future capability:

1. Define and register its descriptor in the capability registry.
2. Implement the capability's provider service outside the Hub.
3. Register its UI module in the module registry.
4. Add capability/module tests.
5. Verify the Hub renders it without any Hub-shell change.

A future capability is not complete until all five steps are satisfied and the final requirement audit records evidence.
