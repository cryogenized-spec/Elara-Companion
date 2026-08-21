# Elara Memory Production Verification

Pass 10 is the final verification gate for the memory architecture.

## Required checks

1. Typecheck: `npm run lint`
2. Full unit/integration suite: `npm test`
3. Memory scaling benchmark: `npm run benchmark:memory`
4. Production bundle: `npm run build`
5. CI workflow must complete successfully for the verification branch/PR.

## Architectural acceptance criteria

- One authoritative IndexedDB memory store.
- `applyMemoryActions()` is the only memory mutation processor.
- `retrieveRelevantMemories()` is the only canonical retrieval engine.
- The legacy flat scratchpad is not injected into Gemini.
- Explicit outgoing message text is the canonical retrieval query.
- Transparency and retrieval diagnostics are read-only/ephemeral projections.
- Maintenance remains on the persistence boundary and is fail-soft.
- Extraction adapters may only create/update grounded observations; they cannot directly delete, merge, or promote memory.
- Malformed model output and persistence failures must degrade without breaking conversation.
- Legacy parallel memory implementations are removed or explicitly archived with no runtime imports.
- Retrieval and prompt context remain bounded as memory volume increases.

## Final verdict rule

The memory architecture is considered production-verified only when all required automated checks pass on the final verification branch and the final architectural acceptance criteria remain true.
