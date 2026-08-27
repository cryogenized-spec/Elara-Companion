# Pass 66 — Google authorization authority lock

`src/services/googleWorkspaceService.ts` is the sole application-facing Google authorization authority. `src/lib/googleAuthorization.ts` owns token lifecycle and OAuth state.

`src/lib/googleApi.ts` is now compatibility-only for older provider imports. It contains no independent token client, access-token state, OAuth scope bundle, token initialization, or revocation transport. Its authorization exports delegate to `googleWorkspaceService`.

This closes the architectural inconsistency identified during the catch-up review while preserving existing consumer-facing names during the remaining migration.
