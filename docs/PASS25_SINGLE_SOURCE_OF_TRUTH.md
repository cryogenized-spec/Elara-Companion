# Pass 25 — Establish Single Sources of Truth

## Completed change

The persisted application setting `ElaraSettings.theme` is now the sole authoritative source for the current application theme.

`src/features/settings/useSettingsController.ts` no longer keeps a second React `theme` state. The controller derives the effective theme directly from `settings.theme`, applies the corresponding document class, and writes theme changes through `setSettings`.

This removes a mirrored state pair that could drift when settings were changed outside the controller. Previously, `settings.theme` and the controller-local `theme` state were synchronized manually, creating two plausible owners.

## Invariant

There must be one authoritative value for persisted theme state:

`application settings.theme -> derived DOM theme class`

The DOM class is a projection, not a second source of truth.

## Deliberately not changed

This pass does not attempt to centralize every application state object. The Pass 24 inventory identifies additional state/persistence surfaces — Workspace, background jobs, compatibility stores, scratchpad projections and other ephemeral controller state — that require their own ownership decisions.

Those remain targets for later state-ownership passes rather than being hidden behind a generic store in this pass.

## Handoff

Before introducing local state for any persisted domain in future work, identify the authoritative representation first. Derived UI state should be computed from that authority whenever practical rather than maintained as a second mutable copy.
