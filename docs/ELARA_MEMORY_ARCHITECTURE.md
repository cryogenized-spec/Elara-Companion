# Elara Memory Architecture

## Purpose

Elara's memory system is a structured knowledge layer, not a single prompt-sized notebook. The Scratchpad is the human-facing inspection surface; the structured memory store is authoritative.

## Memory classes

- **core** — stable identity, durable preferences, important relationships, and long-term facts. Small and highly selective.
- **contextual** — currently relevant projects, circumstances, plans, interests, or ongoing concerns.
- **episodic** — a concrete event or interaction worth retaining as a recoverable episode.
- **observation** — a small atomic detail noticed in conversation. Observations are cheap to create and do not automatically become permanent facts.
- **synthesized** — a higher-level pattern derived from multiple observations or episodes.

These classes describe memory resolution. Existing `MemoryKind` values remain valid and are not being removed in this pass.

## Lifecycle states

- `active` — currently eligible for normal retrieval.
- `stale` — still retained as evidence, but normally receives reduced retrieval weight.
- `archived` — retained for inspection/history and excluded from ordinary retrieval.
- `superseded` — replaced by a newer or more accurate memory.
- `conflicted` — has unresolved contradictory evidence.

This lifecycle state is additive to the existing `MemoryLifecycle` taxonomy. Existing records retain their current lifecycle values and receive `active` (or `archived` where appropriate) as their default state.

## Evidence and provenance

Memory must remain traceable. Records may reference the source conversation, source artifact, related memories, and supporting evidence. A synthesized memory should be able to point back to the observations/episodes that support it.

The current schema therefore reserves fields for supporting memory IDs, conflicts, supersession, retrieval count, evidence count, and observation timestamps.

## Promotion principle

A single observation should normally remain an observation. Repetition, confirmation, specificity, importance, or explicit user statements can increase confidence and allow later passes to promote it into contextual, persistent, or core memory.

## Reconciliation principle

New evidence should not blindly create duplicates. Later passes will compare new observations against existing memories and may reinforce, update, merge, supersede, or flag conflicts.

## Retrieval principle

The structured memory store is authoritative. The derived active scratchpad text is a presentation/cache projection. Later passes will introduce contextual retrieval so only memories relevant to the current conversation are injected into Gemini.

## Observation stream — Pass 2

The memory extractor now treats small, grounded user details as atomic observations rather than requiring them to qualify as permanent memories. Observations may capture circumstances, activities, projects, plans, preferences, routines, interests, relationships, purchases, places, worries, decisions, or one-off events that could become useful later.

New observations are stamped by the processor as `resolution: observation`, `state: active`, with source-conversation provenance, an observation timestamp, and initial evidence/retrieval metadata. This pass intentionally does not promote observations, deduplicate them semantically, decay them, or inject them selectively into the prompt; those responsibilities belong to later passes.

## Compatibility

Schema changes must be additive and migration-safe. Existing records are normalized into the current shape instead of being discarded. `schemaVersion: 3` identifies the Pass 1 memory schema. New fields are optional so pre-v3 records continue to load safely.

## Pass 1 scope

Pass 1 established the contract and migration-safe schema. Pass 2 adds the observation-stream extraction and deterministic observation stamping while leaving retrieval, promotion, reconciliation, decay, and prompt assembly unchanged.
