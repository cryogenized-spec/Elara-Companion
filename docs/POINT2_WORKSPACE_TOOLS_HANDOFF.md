# Point 2 — Durable Workspace tool decomposition

The durable Workspace tool implementation is now split into typed data, declarations, and operation handlers. `background-runtime/src/workspaceTools.ts` remains a stable dispatcher and compatibility boundary.

The operation layer owns artifact creation, reading, updating, listing, renaming, canvas creation, normalization, and revision creation. The Worker typecheck and production verification passed on the extraction run. Final PR CI is required before merge.
