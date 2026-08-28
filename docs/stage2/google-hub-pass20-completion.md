# Google Hub — Pass 20 Completion

## Objective

Establish one canonical, deterministic model-preference contract before changing the visible chat UI. Preference order is distinct from runtime retry/failover behavior.

## Implementation

- `src/lib/reliabilitySettings.ts`
  - Adds `preferredModelOrder` to the existing persisted reliability settings object.
  - Keeps preference order separate from `fallbackModels` and temporary model-health state.
  - Normalizes legacy stored settings that do not contain `preferredModelOrder`.
  - Preserves arbitrary model IDs in the preference field so the domain is not hard-coded to the four legacy fallback models.
- `src/lib/modelPreference.ts`
  - Defines `ModelPreferenceState` for chat/UI consumers.
  - Resolves the effective preference order with the current `ElaraSettings.model` primary model first.
  - Removes unknown/deleted catalog entries safely.
  - Provides friendly model option metadata and preference ranks.
  - Applies preference ordering back into the canonical reliability settings object without creating a second persistence store.

## Invariants

1. Preference order is deterministic: #1 is first preferred, #2 second preferred, #3 least preferred in the current UI contract.
2. Runtime fallback does not rewrite the persisted preference order.
3. Preference order is stored with the canonical `ElaraSettings.reliabilitySettings` state.
4. Fallback policy remains a separate concern.
5. `gemini-3.5-flash` remains represented in the supported model catalog and legacy fallback configuration.
6. Unknown/deleted model IDs are ignored for effective selection while valid models remain usable.
7. Friendly display names are separate from API model IDs.
8. The underlying preference list is not limited to exactly three models.

## Verification

`src/lib/modelPreference.test.ts` covers:

- deterministic primary-first resolution;
- preservation of the stored preference order during fallback;
- unknown/deleted model filtering;
- legacy settings without `preferredModelOrder`;
- known non-fallback models remaining valid in preference order;
- applying reordered preferences to the canonical reliability settings object;
- friendly labels and preference ranks.

Execution status is intentionally determined by repository CI rather than source inspection alone.

## Explicit boundary

Pass 20 does not change the visible chat UI and does not redefine retry/failover conditions. Those belong to later passes.
