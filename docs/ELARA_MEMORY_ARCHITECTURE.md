# Elara Memory Architecture

## Purpose

Elara's memory system is a structured knowledge layer, not a single prompt-sized notebook. The Scratchpad is the human-facing inspection surface; the structured memory store is authoritative.

## Memory classes

- **core** — stable identity, durable preferences, important relationships, and long-term facts. Small and highly selective.
- **contextual** — currently relevant projects, circumstances, plans, interests, or ongoing concerns.
- **episodic** — a concrete event or interaction worth retaining as a recoverable episode.
- **observation** — a small atomic detail noticed in conversation. Observations are cheap to create and do not automatically become permanent facts.
- **synthesized** — a higher-level pattern derived from multiple observations or episodes.

These classes describe memory resolution. Existing `MemoryKind` values remain valid and are not being removed.

## Lifecycle states

- `active` — currently eligible for normal retrieval.
- `stale` — still retained as evidence, but normally receives reduced retrieval weight.
- `archived` — retained for inspection/history and excluded from ordinary retrieval.
- `superseded` — replaced by a newer or more accurate memory.
- `conflicted` — has unresolved contradictory evidence.

This lifecycle state is additive to the existing `MemoryLifecycle` taxonomy. Existing records retain their current lifecycle values and receive `active` (or `archived` where appropriate) as their default state.

## Evidence and provenance

Memory must remain traceable. Records may reference the source conversation, source artifact, related memories, and supporting evidence. A synthesized memory should be able to point back to the observations/episodes that support it.

The schema reserves fields for supporting memory IDs, conflicts, supersession, retrieval count, evidence count, and observation timestamps.

## Observation stream

Gemini's memory extractor records small, grounded details as atomic `observation` records. These are deliberately low-resolution: a single observation is evidence, not automatically a permanent fact. The processor stamps provenance, observation time, evidence count, and active state deterministically.

Observations are allowed to accumulate across conversations. The Scratchpad remains a human-facing projection, while the structured memory store remains authoritative.

The client-side and server-side Gemini adapters both use the same public extraction contract: CREATE/UPDATE/NO_ACTION only, observation resolution, active state, conservative lifecycle/importance, and no direct destructive or promotion actions. The existing `applyMemoryActions()` processor remains the single mutation authority.

## Consolidation and promotion

The consolidation engine compares active observations and related memories using normalized token similarity. High-similarity observations are treated as duplicate candidates and reinforce the preferred record rather than being immediately deleted. Potentially contradictory related records are marked `conflicted` with reciprocal links so later reconciliation can resolve them.

Observations may be promoted only after repeated reinforcement/evidence. Promotion is conservative: preferences/facts can become `core`, while project/plan/working material becomes `contextual` and other repeated observations become `episodic`.

## Contextual retrieval

Pass 4 introduced a standalone ranked retrieval engine over the structured memory store. `retrieveRelevantMemories()` combines content similarity, topic hints, project relationships, freshness, importance, resolution, lifecycle state, reinforcement, and evidence into a bounded relevance score. Archived and superseded memories are excluded by default, while conflicted memories are also excluded unless explicitly requested.

Retrieval is deterministic: equal scores resolve by update time and finally memory ID. Formatted context has a hard character budget so memory growth cannot cause unbounded prompt expansion.

## Gemini context integration

Pass 5 now uses the retrieval layer during prompt assembly. The normalized IndexedDB memory state is mirrored locally for synchronous lookup, stable core memories are kept in a small bounded set, and query-relevant contextual memories are ranked and injected into `[RETRIEVED MEMORY CONTEXT]`. The legacy flat scratchpad string is no longer injected into Gemini. The Scratchpad itself remains available as the user-facing inspection surface.

## Maintenance and decay

Pass 6 strengthens the existing maintenance system rather than creating another scheduler. Maintenance runs at the persistence boundary on the existing daily interval when automatic maintenance is enabled.

Maintenance marks stale working/contextual/persistent records as `stale` without deleting them, archives records whose explicit expiry has elapsed, restores eligible stale records to `active` when their freshness is renewed, detects exact duplicate groups for later reconciliation, and compacts supporting evidence ID lists while preserving the aggregate evidence count.

Core and pinned records are protected. Conflicted and superseded states are preserved rather than silently overwritten. Maintenance is schema-v3 aware and fails soft at the persistence boundary.

## Transparency and inspection

Pass 7 adds an **Insights** control inside the existing Scratchpad. It opens a read-only inspection surface derived directly from the structured memory state: total/active/stale/archived/core/pinned/conflicted/evidence-backed counts, last maintenance time, and per-memory explanations for why the record exists.

Per-memory inspection exposes resolution, state, confidence, importance, evidence/reinforcement, provenance, freshness, related/conflicting memories, and supersession relationships. The panel does not edit or delete records and does not create a second memory store or retrieval path.

Retrieval transparency remains an ephemeral diagnostic trace and is not persisted as memory.

## Final hardening invariants

The memory architecture now has explicit boundaries:

- IndexedDB memory state is the single authoritative store.
- The local structured memory mirror and Scratchpad text are derived projections only.
- `applyMemoryActions()` is the single mutation processor for memory records.
- `retrieveRelevantMemories()` is the canonical retrieval engine.
- `buildSystemPayload()` is the canonical context-assembly path.
- Memory maintenance is bounded to the existing scheduler/persistence boundary.
- Read-only inspection paths explicitly disable maintenance and projection writes.
- Memory extraction adapters fail soft and cannot directly delete, merge, or promote memories.
- Retrieval order is deterministic and formatted context is hard-bounded by character count.
- `MERGE` preserves original records as `superseded` and points the synthesized record back to them as evidence/provenance.
- Schema normalization isolates malformed records instead of invalidating the whole notebook.
- Chat remains usable when memory extraction, maintenance, or persistence fails.

## Compatibility

Schema changes must be additive and migration-safe. Existing records are normalized into the current shape instead of being discarded. `schemaVersion: 3` identifies the current memory schema.

## Pass status

- **Pass 1 — Schema & architecture contract:** implemented.
- **Pass 2 — Observation stream:** implemented.
- **Pass 3 — Deduplication, reconciliation & promotion:** implemented conservatively.
- **Pass 4 — Contextual retrieval engine:** implemented.
- **Pass 5 — Gemini context integration:** implemented.
- **Pass 6 — Consolidation, decay & maintenance:** implemented on the existing persistence boundary.
- **Pass 7 — Transparency & inspection:** implemented.
- **Pass 8 — Failure & recovery hardening:** implemented.
- **Pass 9 — Final architecture audit:** in progress; live-path audit has identified and corrected a second server-side extraction contract, while unreferenced legacy memory UI/retrieval files are tracked for cleanup review.

The architecture is considered coherent only when the final audit confirms these invariants against the live repository and the production verification gate passes.
