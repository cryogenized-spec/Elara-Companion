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

## Consolidation and promotion

The consolidation engine compares active observations and related memories using normalized token similarity. High-similarity observations are treated as duplicate candidates and reinforce the preferred record rather than being immediately deleted. Potentially contradictory related records are marked `conflicted` with reciprocal links so later reconciliation can resolve them.

Observations may be promoted only after repeated reinforcement/evidence. Promotion is conservative: preferences/facts can become `core`, while project/plan/working material becomes `contextual` and other repeated observations become `episodic`.

## Contextual retrieval

Pass 4 introduces a standalone ranked retrieval engine over the structured memory store. `retrieveRelevantMemories()` combines content similarity, topic hints, project relationships, freshness, importance, resolution, lifecycle state, reinforcement, and evidence into a bounded relevance score. Archived and superseded memories are excluded by default, while conflicted memories are also excluded unless explicitly requested.

Retrieval is deterministic: equal scores resolve by update time and finally memory ID. Formatted context has a hard character budget so memory growth cannot cause unbounded prompt expansion.

## Gemini context integration

Pass 5 integrates contextual retrieval into the real system-payload builder. Stable profile information remains available separately, while memory context is assembled from a small set of core memories plus query-relevant contextual/episodic/observation/synthesized records. The old flat active-scratchpad text is no longer injected wholesale into Gemini.

The structured IndexedDB memory state is authoritative. A normalized local mirror exists only to make synchronous context assembly safe and fast; it is refreshed whenever the structured memory state is loaded or saved and is not an independent source of truth.

## Maintenance and decay

Pass 6 strengthens the existing maintenance system rather than creating another scheduler. Maintenance runs at the persistence boundary on the existing daily interval when automatic maintenance is enabled.

Maintenance marks stale working/contextual/persistent records as `stale` without deleting them, archives records whose explicit expiry has elapsed, restores eligible stale records to `active` when their freshness is renewed, detects exact duplicate groups for later reconciliation, and compacts supporting evidence ID lists while preserving the aggregate evidence count.

Core and pinned records are protected. Conflicted and superseded states are preserved rather than silently overwritten. Maintenance is schema-v3 aware.

## Transparency and inspection

Pass 7 adds a read-only per-memory inspector to the existing Chat & Editor settings. It exposes resolution, state, confidence, importance, provenance, evidence, reinforcement, retrieval count, relationships, conflicts, and archival semantics without changing memory scoring, retrieval, promotion, or maintenance behavior.

## Final hardening invariants

Pass 8 makes the memory subsystem defensive around its boundaries:

- schema normalization repairs malformed booleans and evidence-count drift instead of trusting persisted types.
- retrieval order is deterministic and formatted context is hard-bounded by character count.
- `MERGE` preserves original records as `superseded` and points the synthesized record back to them as evidence/provenance.
- memory persistence helpers are safe in browser and non-browser runtimes.
- memory reads can explicitly opt out of maintenance and derived projection writes for genuinely read-only inspection paths.
- structured memory remains the single source of truth; the text Scratchpad is only a derived projection.

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
- **Pass 8 — Final hardening & regression:** in progress.
