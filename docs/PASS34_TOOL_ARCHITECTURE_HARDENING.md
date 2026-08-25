# Pass 34 — Plugin / Tool Architecture Hardening

## Objective

Make agent tools independently extensible and enforce a stable capability boundary so adding a tool does not require modifying unrelated orchestration or weakening authorization.

## What changed

- Strengthened `ToolPlugin` contracts with explicit capability, effect, invocation-source, plugin identity, and invocation ID metadata.
- Hardened `ToolPluginRegistry` validation for plugin IDs, version, duplicate declarations, ownership collisions, malformed declaration metadata, normalized tool names, and execution-context construction.
- Execution arguments are copied before dispatch so authorization/execution cannot mutate the caller's object by reference.
- Added the first independently owned built-in capability module: `artifactToolPlugin` for `create_artifact`, `read_artifact`, `update_artifact`, `list_artifacts`, and `rename_artifact`.
- Removed those five tools from the generic Workspace plugin's ownership surface while preserving their existing execution implementation underneath.
- Added registry and agent-surface regression coverage for collision rejection, metadata injection, normalized invocation, artifact ownership, and existing Google confirmation rules.

## Architectural result

The plugin registry is now an enforcement boundary, not just a lookup table. A tool declares what it can touch (`capabilities`) and what kind of mutation it performs (`effects`), while the registry supplies stable execution metadata (`invocationId`, `source`, `pluginId`).

The artifact family demonstrates the intended migration pattern: define the capability in its own plugin module, register it independently, and only later extract the underlying implementation from the remaining legacy dispatcher. This avoids duplicating behavior during architectural surgery.

## Deliberate deferrals

The underlying implementations in `workspaceTools.ts`, `googleAgentTools.ts`, `googleAgentOperationalTools.ts`, and related compatibility modules are still larger than their plugin wrappers. They remain implementation infrastructure, not canonical ownership surfaces. Later tool/plugin work should physically extract additional families from these monoliths.

No broad tool rewrite or change in tool semantics was made in this pass.

## Invariants

- A tool has exactly one registered owner.
- A plugin cannot silently claim another plugin's tool.
- Tool declarations must be normalized and contract-valid before registration.
- Authorization sees the same normalized invocation identity as execution.
- Capability/effect metadata is descriptive and enforced by future policy layers; it is not a substitute for authorization.
- Tool plugins must not become hidden owners of React state or persistence.

## Future handoff

Pass 35 should harden automation/background architecture around the same command/event and capability model. Subsequent tool passes should continue extracting tool families out of the remaining monolithic `lib/*Tools` implementations and eliminate legacy compatibility bridges once their consumers are migrated.
