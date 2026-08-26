# Pass 59 — Google Tool Delegation

Pass 59 removes duplicate Google Sheets/Keep implementation from `googleAgentTools.ts`.

The canonical service layer now owns the provider implementation. `googleSheetsService.ts` accepts an explicit token for agent/background callers while retaining canonical capability-based authorization for UI callers. `googleKeepService.ts` already supported the explicit-token path and is now used directly by the agent tool.

`googleAgentTools.ts` remains responsible for tool declarations, argument adaptation, and ToolResult shaping; it no longer owns Google REST endpoints for Sheets or Keep.

Next: audit `googleAgentOperationalTools.ts` for the same duplicate-provider pattern and verify the tool registry is composition-only.

The legacy/reference repository remains untouched; all surgery occurs in `Elara-Companion`.
