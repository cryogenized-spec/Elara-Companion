# Pass 23 — Dependency Direction Audit

Status: complete.

Pass 23 audited dependency direction across the successor repository against the canonical layer model established in Pass 16 and the service boundaries established through Pass 22.

## Confirmed healthy direction

The following application-facing boundaries are now being used in the intended direction:

- Google UI -> `googleWorkspaceService`
- Workspace feature orchestration -> `workspaceService`
- Memory application state -> `memoryService`
- Background runtime controller -> `backgroundRuntimeService`
- Scratchpad UI -> `scratchpadService`
- Model-tuning UI -> `modelTuningService`

The UI-facing boundaries introduced in Passes 17–22 are therefore not creating new sideways dependencies or duplicate infrastructure access.

## Remaining backwards edges

`App.tsx` remains the principal concentration of dependency-direction violations. It still imports several legacy/infrastructure modules directly, including conversation export/rate-limit helpers, world-state persistence helpers, memory compatibility helpers, and Workspace storage functions. It also previously contained a direct portrait persistence call even though application state already owns portrait persistence.

These are not being hidden behind a generic catch-all service in Pass 23. They are explicit extraction targets for later passes, because each represents a different responsibility with a different canonical owner. In particular, the remaining Workspace storage imports should move behind `workspaceService`, while world-state, memory export/import, conversation export, and rate-limit responsibilities require their own properly scoped boundaries.

The repository connector could not safely apply a surgical edit to the large `App.tsx` blob in this pass because the available file-content route truncates the full source payload. No risky partial replacement was attempted.

## Architectural rule locked by this pass

Do not add new direct infrastructure imports to `App.tsx` or any React presentation component. When existing direct imports are encountered, extract them into the appropriate service/application boundary rather than creating a generic omnibus service.

Pass 23 is therefore an audit-and-lock pass, not a claim that every historical dependency-direction violation has already been removed.

## Handoff targets

The next state-ownership programme should use this audit as input. Any later pass modifying `App.tsx` should reduce its direct imports from `src/lib/*`, not increase them.
