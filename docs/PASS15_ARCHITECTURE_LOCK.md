# Pass 15 — Canonical Architecture Lock

Pass 15 formally locks the canonical architectural boundaries established by Passes 1–14.

The authoritative architecture is documented in `docs/CANONICAL_ARCHITECTURE.md`.

The successor repository `cryogenized-spec/Elara-Companion` is the operating architecture. The legacy repository `cryogenized-spec/Elara-companion-app-v2` remains historical/recovery reference only.

From this point forward, architectural work must preserve one authoritative implementation per responsibility, remove obsolete parallel paths once verified, and avoid resurrecting deleted migration/build scaffolding.

This record exists to provide a clean PR/merge checkpoint for the Pass 15 lock without changing application runtime behaviour.
