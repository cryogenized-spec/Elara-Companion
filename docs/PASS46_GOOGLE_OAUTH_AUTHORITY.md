# Pass 46 — Google OAuth Authority

## Objective

Consolidate the remaining active Google credential reads behind the canonical Google identity boundary without prematurely deleting the broad legacy API adapter.

## What changed

`src/lib/googleRuntime.ts` no longer imports `googleApi.isGoogleConnected()`. It now reads authorization state through `googleWorkspaceService.googleIdentity.isAuthorized()`.

`src/lib/googleAuthLifecycleTool.ts` no longer obtains a token from `googleApi` or calls the separate lifecycle revocation helper. It now delegates revocation to `googleWorkspaceService.googleIdentity.revoke()`.

A regression guard verifies that these two active runtime/auth-lifecycle paths do not reacquire direct `googleApi` imports.

## Architectural result

Credential authority for these paths is now:

`runtime / auth lifecycle tool → Google identity service → googleAuthorization`

The broad `src/lib/googleApi.ts` implementation remains in place because other live consumers, especially the historical Settings surface, still depend on its API adapter functions. This pass therefore consolidates authority without pretending the provider decomposition is already complete.

## Deliberately deferred

- decomposition of `googleApi.ts` by capability
- migration of Settings Google operations
- migration of remaining Google agent/tool adapters
- least-privilege scope changes
- OAuth/PKCE/security-behaviour changes beyond authority consolidation
- physical deletion of `googleApi.ts`

## Verification

Pass 46 verification completed successfully:

```text
npm install               PASS
npm run lint              PASS
npm test                  PASS
npm run build             PASS
npm run benchmark:memory  PASS
```

The temporary Pass 46 verification workflow was removed before merge.

## Handoff to Pass 47

Pass 47 should decompose the Google provider surface into narrow capability/service adapters. Start with the functions currently consumed by Settings and agent tooling. Inventory callers before moving any implementation.

Target direction:

`feature/UI/tool → Google capability contract/service → capability adapter → Google API`

Do not create a second OAuth/token owner while extracting adapters. `googleWorkspaceService.googleIdentity` remains the canonical credential authority.

Legacy production/reference repository remains untouched.
