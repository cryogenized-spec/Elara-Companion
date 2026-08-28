# Google Hub Integration Remediation

Date: 2026-08-28
Branch: `feature/google-hub-pass10`

This note records the remediation after the penultimate audit of Stage 2.

## Fixed

- The Google Hub is exposed from the application sidebar through `GoogleHubModal`.
- Hub panels are composed through registered capability-module factories rather than a capability switchboard inside `GoogleHubModal`.
- Google account email is resolved through the provider-facing Google workspace service; the Hub still receives only display-safe identity data.
- The Hub now has a global `Ask Elara about Google data` action.
- The Ask action routes through the existing chat command event seam (`elara:ask`) so it creates/sends a normal Elara chat message rather than inventing a parallel assistant pathway.
- Permissions now expose the capability description, why access is required, data-access explanation, required capability groups, and capability opening/enable actions.
- Google access revocation is deliberately account-wide and clearly described as such because the implementation uses a shared OAuth token; the UI does not pretend individual scope revocation exists.
- Identity-only Google authorization is represented as partial authorization rather than an ambiguous disconnected state.
- The obsolete `GoogleCapabilitySettingsPanel` was removed so there is no second capability-settings implementation competing with the Hub.

## Intentionally preserved

`SettingsModal.tsx` still contains historical Google Workspace implementation code. The new Hub is now the dedicated Google entry point, but the large legacy Settings component has not been mechanically rewritten in this remediation because reconstructing that file through the repository API would risk deleting unrelated settings. The next cleanup operation should remove only its Google-specific imports, state, handlers, and workspace UI after a full file-level edit is available.

## Verification boundary

Source-level inspection has been performed on the final branch. GitHub reports no CI status for the final feature commit, and this execution environment cannot install dependencies from GitHub, so a successful TypeScript/lint/test execution is not claimed here.
