# Pass 36 — Testing Architecture

## Objective

Build regression coverage around architectural boundaries, with special attention to state consistency, capability exposure, automation isolation, model-input boundaries, and recovery behavior.

## Security/Exposure finding

The model runtime previously received the complete `agentToolDeclarations` surface regardless of its actual capabilities. Execution authorization happened later, which meant the model could discover tools it could not necessarily use.

This pass adds an explicit model-facing `ToolExposurePolicy` and filters declarations before they are placed into Gemini `config.tools`.

Interactive chat:
- Workspace tools remain available.
- Google tools are exposed only when a Google capability is explicitly present in the runtime configuration.
- Google writes/auth changes still pass through the existing execution-time authorization and explicit-confirmation policy.

Automation:
- Workspace tools remain available.
- Only `google.read` is exposed when a Google token is supplied.
- `external-write` and `auth-change` effects are hidden from the model entirely.
- Execution-time authorization remains a second, independent gate.

## Portrait/input boundary finding

`customPortrait` is application state owned by `useApplicationStateController`, but it is not passed into `buildRuntimeConfig` or otherwise automatically inserted into model contents.

Model image input enters through explicit chat history/current-message `image` fields handled by `buildConversationContents`.

Regression coverage now verifies that ordinary text chat does not acquire an image part implicitly and that image data appears only when explicitly supplied.

This does not prove what a running browser may display locally; it proves the current Gemini request construction does not silently inject the persisted portrait.

## Test architecture additions

`src/security/toolExposurePolicy.ts` provides the framework-independent exposure policy contract.

`ToolPluginRegistry.getDeclarations(policy)` applies the policy before model-facing tool declarations are emitted.

`src/security/__tests__/toolExposureBoundary.test.ts` covers:
- Google capability absence/presence
- automation write/auth suppression
- explicit image-only input behavior
- preservation of the existing safety-settings configuration

## Important remaining security consideration

`chatRuntime.ts` currently defines explicit Gemini safety settings with `BLOCK_NONE` thresholds. This pass does not alter that deliberate policy because changing provider safety behavior is a separate product/security decision, not a hidden side effect of testing architecture.

The architectural boundary is therefore now:

`model-visible tools → exposure policy → Gemini`

then independently:

`tool invocation → capability metadata → execution authorization → provider action`

A future hardening pass should evaluate whether the `BLOCK_NONE` provider policy remains appropriate for production, but must do so as an explicit decision with behavioral testing rather than accidental drift.

## Handoff

Future passes must keep model-visible capability minimization as a first-class invariant. Adding a new tool should require explicitly declaring its capabilities/effects; otherwise it should not silently become available to every runtime.
