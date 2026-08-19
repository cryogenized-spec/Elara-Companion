# Elara Automation State

The automation system keeps personal automation definitions and execution state out of this public repository.

Create a separate **private GitHub repository** for the state, for example `Elara-private-state`, containing:

- `automations.json` — automation definitions.
- `runtime.json` — scheduler and execution state.

The GitHub Actions worker in this repository reads and writes that private repository through a fine-grained token stored as the `ELARA_STATE_TOKEN` Actions secret. Set `ELARA_STATE_REPO` as a repository variable to the private repository name, e.g. `cryogenized-spec/Elara-private-state`.

## Pass 3 agent execution

The executor now runs the same Elara agent runtime used by the main chat path. It requires these Actions secrets/variables:

- `ELARA_STATE_TOKEN` — fine-grained GitHub token with Contents read/write access to the private state repository.
- `GEMINI_API_KEY` — Gemini API key used by the server-side Elara runtime.
- `ELARA_GOOGLE_TOKEN` — optional Google access token for read-only Google Workspace context during an automation run.
- `GEMINI_MODEL` — optional repository variable; the executor falls back to the runtime's default model when omitted.

Automation runs execute without a browser. They can use local Workspace tools in-memory and read-only Google tools when a valid Google token is supplied. External Google writes, deletes, sends, and authentication changes remain blocked by the canonical authorization policy until an explicit automation authorization model is added in a later pass.

No personal automation prompts or Google credentials should be committed to this public repository.

The state format is documented in `automation-state/schema.json`.
