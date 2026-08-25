# Pass 34 — Plugin / Tool Architecture Hardening

## Objective

Make agent tools independently extensible so adding a new capability does not require modifying a central execution switch or teaching unrelated subsystems about the new tool.

## Implemented

- Added `ToolPlugin` and `ToolExecutionContext` contracts that are independent of the registry implementation.
- Added `ToolPluginRegistry` with explicit plugin registration, duplicate-plugin detection, duplicate-tool detection, declaration ownership validation, authorization hooks, and unknown-tool handling.
- Adapted the existing Workspace, Google Agent, Google Operational, and Google Authentication Lifecycle tool families into independently registered plugins.
- `agentToolRegistry.ts` is now a compatibility facade over the plugin registry rather than the owner of per-tool routing.
- Existing Google authorization and explicit-external-confirmation behavior is preserved inside the relevant plugin adapters.
- Added regression tests for independent registration, collision detection, ownership validation, and unknown-tool isolation.

## Architectural result

The extension path is now:

`tool plugin -> declarations + authorization + execution -> ToolPluginRegistry -> agent runtime`

rather than:

`agentToolRegistry -> giant conditional dispatcher -> implementation family`

A future tool family can implement `ToolPlugin`, register itself in the built-in plugin collection, and own its execution path without adding another branch to `agentToolRegistry`.

## Deliberate remaining work

`workspaceTools.ts` remains a large implementation module containing the existing Workspace declaration catalogue and operation switch. Pass 34 has removed its ownership of the central agent dispatcher, but the internal Workspace tool family can still be split into smaller tool modules later without changing the plugin contract.

Google provider consolidation remains separately governed by the Google architecture passes; this pass preserves the current authorization behavior rather than introducing another credential authority.

## Invariants

- A tool name has exactly one plugin owner.
- A plugin must explicitly claim every tool it declares.
- Authorization happens before execution and belongs to the plugin/capability boundary.
- Tool implementations must not import the central registry.
- The central agent registry must not contain per-tool execution branches.
- Tool declarations are derived from registered plugins rather than maintained as a second manual catalogue.
