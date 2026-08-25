# Pass 22 — UI Purity

Pass 22 audited React/UI components for direct knowledge of persistence, provider, registry, and infrastructure details.

## Completed

- `ScratchpadPanel.tsx` now uses `src/services/scratchpadService.ts` for projection load/save and structured memory refresh.
- `ModelTuningQuickPanel.tsx` now uses `src/services/modelTuningService.ts` for settings persistence, model discovery/profile lookup, theme application, and thinking-display persistence.
- No user-facing behaviour was intentionally redesigned.

## Deliberately deferred

`SettingsModal.tsx` remains the largest UI-purity hotspot. It still contains direct Google API orchestration and direct snapshot persistence. This was deliberately not folded into Pass 22 because it is a large legacy concentration point that needs to be separated by responsibility, not hidden behind a giant catch-all facade. Its eventual extraction belongs with the settings consolidation work and related Google service boundaries.

The repository-wide rule remains: UI components may orchestrate user interaction, but persistence, provider access, model discovery, theme persistence, and other infrastructure mechanics must be reached through application/service boundaries.

## Continuity note

Future thread instances should treat this file and `docs/CANONICAL_ARCHITECTURE.md` as the handoff record for Pass 22. The important decision is not merely that two imports changed; it is that the UI is no longer a direct owner/consumer of those underlying implementation concerns, while the large SettingsModal concentration remains intentionally scheduled rather than duplicated into another abstraction.
