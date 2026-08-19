# Elara Automation State

Pass 2 keeps personal automation definitions and execution state out of this public repository.

Create a separate **private GitHub repository** for the state, for example `Elara-private-state`, containing:

- `automations.json` — automation definitions.
- `runtime.json` — scheduler/run state.

The GitHub Actions worker in this repository reads and writes that private repository through a fine-grained token stored as the `ELARA_STATE_TOKEN` Actions secret. Set `ELARA_STATE_REPO` as a repository variable to the private repository name, e.g. `cryogenized-spec/Elara-private-state`.

The state format is documented in `automation-state/schema.json`.

No personal automation prompts should be committed to this public repository.
