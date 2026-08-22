# Elara Lockbox

## Pass 1 — Secret and Environment Inventory

This document is the authoritative inventory for Elara's environment variables, secrets, runtime bindings, and external credential boundaries.

**Important:** this file records names, ownership, exposure, and usage observed in the repository. It never stores secret values. Repository inspection cannot prove whether a corresponding secret is currently configured in GitHub, Cloudflare, AI Studio, or another external control plane.

## Trust-boundary rules

1. **Browser code may receive public configuration only.** Anything capable of authenticating a server, worker, deployment system, GitHub repository, or automation executor is server/runtime-only.
2. `VITE_*` variables are treated as browser-visible by definition. They are never a safe place for a secret.
3. Google OAuth client IDs are public configuration; OAuth client secrets and refresh/access tokens are sensitive credentials.
4. Gemini API keys are secrets and must remain server/runtime-only.
5. Cloudflare API tokens and GitHub state tokens are critical infrastructure secrets.
6. Automation credentials receive the highest protection tier because they can cause Elara to act without an interactive user.
7. Secret values must never be committed, rendered into client bundles, logged, or returned from configuration endpoints.

## Inventory

| Name / binding | Classification | Environment | Observed use | Exposure | Source of truth | Status |
|---|---|---|---|---|---|---|
| `GEMINI_API_KEY` | `CRITICAL_SECRET` | server + CI automation | Gemini client; automation executor | server/runtime only | AI Studio / GitHub Actions secret | referenced in repo; live configuration not verified |
| `GEMINI_MODEL` | `PUBLIC_CONFIG` | server + CI automation | default Gemini model selection | server/runtime | environment / GitHub Actions variable | referenced in repo |
| `NODE_ENV` | `RUNTIME_CONFIG` | server | development vs production server mode | server | runtime environment | referenced in repo |
| `APP_URL` | `PUBLIC_CONFIG` | app/server | documented for hosted URL/OAuth callback use | potentially public | deployment environment | declared in `.env.example`; active runtime usage requires follow-up validation |
| `VITE_GOOGLE_CLIENT_ID` | `PUBLIC_CONFIG` | browser | optional Google Identity Services client ID | browser-visible | Vite environment | referenced in repo |
| `GOOGLE_CLIENT_ID` | `PUBLIC_CONFIG` | compatibility/server | fallback env name accepted by browser Google helper | browser/runtime dependent | environment | referenced in repo |
| `GOOGLE_OAUTH_CLIENT_ID` | `PUBLIC_CONFIG` | background worker | Google OAuth authorization URL + token exchange | worker | Cloudflare Worker environment | required by worker contract |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `CRITICAL_SECRET` | background worker | Google OAuth code exchange and token refresh | worker only | Cloudflare Worker secret | required by worker contract |
| `GOOGLE_OAUTH_REDIRECT_URI` | `PUBLIC_CONFIG` | background worker | OAuth redirect target | worker/config | Cloudflare Worker environment | required by worker contract |
| `GOOGLE_VAULT_KV` | `PRIVATE_BINDING` | background worker | stores OAuth state and encrypted-at-rest application refresh-token record | worker only | Cloudflare KV binding | required by Wrangler config |
| `GOOGLE_VAULT_KV_NAMESPACE_ID` | `INFRA_SECRET` | deployment CI | substitutes the Google vault KV namespace ID during auth-worker deployment | CI only | GitHub Actions secret | referenced by deploy workflow |
| `CLOUDFLARE_API_TOKEN` | `CRITICAL_SECRET` | deployment CI | Wrangler deployment authentication | CI only | GitHub Actions secret | referenced by deploy workflows |
| `CLOUDFLARE_ACCOUNT_ID` | `INFRA_CONFIG` | deployment CI | Wrangler target account | CI only | GitHub Actions secret in current workflow | referenced by deploy workflows |
| `ELARA_STATE_REPO` | `PRIVATE_CONFIG` | automation CI | repository containing private automation state | CI only | GitHub Actions variable | referenced by dispatcher/executor |
| `ELARA_STATE_TOKEN` | `CRITICAL_SECRET` | automation CI | GitHub API authorization for automation state read/write | CI only | GitHub Actions secret | referenced by dispatcher/executor |
| `ELARA_GOOGLE_TOKEN` | `CRITICAL_SECRET` | automation CI | Google authorization passed into scheduled agent execution | CI only | GitHub Actions secret | referenced by executor |
| `AUTOMATION_ID` | `JOB_INPUT` | automation CI | identifies scheduled automation | CI only | workflow dispatch input | not a secret |
| `EXECUTION_KEY` | `JOB_INPUT` | automation CI | idempotent automation execution key | CI only | workflow dispatch input | not a secret |
| `GITHUB_REPOSITORY` | `RUNTIME_METADATA` | automation CI | current repository identity | CI-provided | GitHub Actions | not a secret |
| `GITHUB_SERVER_URL` | `RUNTIME_METADATA` | automation CI | current GitHub server URL for execution links | CI-provided | GitHub Actions | not a secret |
| `GITHUB_RUN_ID` | `RUNTIME_METADATA` | automation CI | current workflow execution ID | CI-provided | GitHub Actions | not a secret |
| `ELARA_CHAT_WORKFLOW` | `PRIVATE_BINDING` | background worker | Cloudflare Workflow binding | worker only | Wrangler binding | required by Wrangler config |

## Credential domains

### 1. Gemini

`GEMINI_API_KEY` is the primary AI credential. The server-side Gemini client reads it directly from `process.env`, and the automation executor also requires it. It must remain server/CI-only.

`GEMINI_MODEL` is configuration, not a secret.

### 2. Google browser OAuth

The browser integration uses a Google OAuth client ID. The current implementation accepts `VITE_GOOGLE_CLIENT_ID`, a compatibility `GOOGLE_CLIENT_ID`, and a custom client ID stored in browser local storage. A client ID is public configuration; it is not a secret.

The browser stores a short-lived access token in memory. That token must never be promoted into persistent app configuration or source control.

### 3. Google background-runtime vault

The Cloudflare Worker has a separate OAuth trust boundary. It expects `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI`, plus a `GOOGLE_VAULT_KV` KV binding. The vault stores OAuth state and a Google refresh-token record.

The refresh token is sensitive credential material and must be treated as `CRITICAL_SECRET` data even though its storage backend is a KV binding rather than an environment variable.

### 4. Cloudflare infrastructure

Deployment workflows authenticate Wrangler with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. These belong to the deployment plane, not the application runtime plane.

### 5. Automations

The automation dispatcher and executor use `ELARA_STATE_REPO` + `ELARA_STATE_TOKEN` to read/write private automation state through GitHub's Contents API. The executor also receives `GEMINI_API_KEY` and `ELARA_GOOGLE_TOKEN` as workflow secrets.

Because scheduled automation can act without an interactive user, these credentials are deliberately classified as critical.

## Current architecture map

```text
Browser
  |
  +-- public config ------------------------> VITE_GOOGLE_CLIENT_ID
  |
  +-- short-lived Google access token ------> memory only
  |
  v
Elara application server
  |
  +-- GEMINI_API_KEY -----------------------> Gemini API
  |
  v
Cloudflare background runtime
  |
  +-- GOOGLE_OAUTH_CLIENT_ID ---------------> Google OAuth
  +-- GOOGLE_OAUTH_CLIENT_SECRET -----------> Google OAuth
  +-- GOOGLE_OAUTH_REDIRECT_URI ------------> Google OAuth
  +-- GOOGLE_VAULT_KV ----------------------> refresh-token/state storage
  |
  v
GitHub automation plane
  |
  +-- ELARA_STATE_TOKEN --------------------> private state repository
  +-- GEMINI_API_KEY -----------------------> Gemini API
  +-- ELARA_GOOGLE_TOKEN -------------------> Google services
  +-- CLOUDFLARE_* -------------------------> deployment only
```

## What Pass 1 intentionally does not do

Pass 1 does not change how credentials are loaded. It does not migrate secrets, rotate them, create Cloudflare secrets, alter GitHub Actions settings, or add a runtime abstraction yet.

Those are Pass 2+ responsibilities after the inventory has been reviewed against the live control planes.

## Known follow-up checks

- Confirm whether `APP_URL` is still actively consumed or is legacy configuration.
- Confirm the exact live GitHub Actions repository variables/secrets corresponding to this inventory.
- Confirm the live Cloudflare Worker bindings and secrets for both runtime and Google-auth deployments.
- Confirm where the Google refresh token is actually stored operationally and whether additional application-layer encryption is required before KV persistence.
- Replace direct environment access with a typed Lockbox adapter in later passes.
- Add CI secret-exposure tests before migrating callers.
