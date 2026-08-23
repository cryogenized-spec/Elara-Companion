# Elara V2 — Master Setup & Environment Guide

This is the human-friendly setup guide for Elara V2.

Use this document when you need to configure Elara, connect Google, deploy the Cloudflare Workers, configure GitHub Actions, or fix an environment-variable error.

## 0. The one rule to remember

Do **not** put real secret values into this repository.

The repository's Lockbox is the authoritative map of what Elara needs and where each value is allowed to live. The Lockbox records names, classifications, ownership, and exposure boundaries; it intentionally does not store the actual secret values.

The technical Lockbox files are:

- [`config/lockbox.ts`](../config/lockbox.ts) — typed application Lockbox.
- [`config/lockbox.manifest.json`](../config/lockbox.manifest.json) — authoritative inventory.
- [`docs/LOCKBOX.md`](./LOCKBOX.md) — explanation and security policy.
- [`docs/LOCKBOX_VERIFICATION.md`](./LOCKBOX_VERIFICATION.md) — verification notes.

The current Lockbox covers Gemini, Google OAuth, Cloudflare, GitHub automation, and the private automation state boundary.

## 1. Understand where each value goes

Think of Elara as having several separate “drawers”. Do not mix them.

| Place | What belongs there | Examples |
|---|---|---|
| Local `.env` | Values needed while you run Elara locally | `GEMINI_API_KEY`, local configuration |
| GitHub Actions Secrets | Sensitive values used by GitHub workflows | `ELARA_STATE_TOKEN`, `CLOUDFLARE_API_TOKEN`, `GEMINI_API_KEY` |
| GitHub Actions Variables | Non-secret workflow configuration | `ELARA_STATE_REPO`, `GEMINI_MODEL` |
| Cloudflare Worker Secrets | Sensitive values used by deployed Workers | `GOOGLE_OAUTH_CLIENT_SECRET`, `ELARA_BACKGROUND_TOKEN`, `GEMINI_API_KEY` |
| Cloudflare Worker Variables | Non-secret Worker configuration | OAuth redirect URI and other public/config values when required |
| Cloudflare KV | Durable private runtime data | Google OAuth state and refresh-token record |
| Google Cloud / Google AI Studio | Credentials issued by Google | Gemini API key, Google OAuth client ID/secret |
| Browser | Public configuration only | Google client ID, never an API secret |

GitHub Secrets are encrypted and are intended for API keys, tokens, and other credentials. GitHub Variables are for non-sensitive configuration. ([GitHub Secrets](https://docs.github.com/en/actions/concepts/security/secrets), [GitHub Variables](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables))

Cloudflare distinguishes encrypted Worker Secrets from normal plaintext environment variables. Use Worker Secrets for anything sensitive. ([Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Cloudflare environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/))

## 2. Start here: open the repository

Open the Elara V2 repository:

https://github.com/cryogenized-spec/Elara-companion-app-v2

Open the technical Lockbox:

https://github.com/cryogenized-spec/Elara-companion-app-v2/blob/main/config/lockbox.manifest.json

Open the detailed security explanation:

https://github.com/cryogenized-spec/Elara-companion-app-v2/blob/main/docs/LOCKBOX.md

When something says “check the Lockbox”, start with `config/lockbox.manifest.json`.

## 3. Set up local development first

The local environment is where you test Elara without deploying anything.

### 3.1 Open the project terminal

From the Elara V2 project directory, open your terminal.

Run:

```bash
npm install
```

### 3.2 Create your local `.env`

Create a file named:

```text
.env
```

in the root of the Elara V2 repository.

Do **not** commit this file.

The repository already contains an example file:

```text
.env.example
```

Open it here:

https://github.com/cryogenized-spec/Elara-companion-app-v2/blob/main/.env.example

The local file may contain values that are appropriate for local development. Never paste production secrets into source files that will be committed.

### 3.3 Run the application

```bash
npm run dev
```

### 3.4 Run the checks

```bash
npm run lint
npm test
npm run build
```

## 4. Fixing the automation error you just saw

The exact error was:

```text
Error: Required Lockbox configuration ELARA_STATE_REPO is not configured.
```

This does **not** mean that Cloudflare is missing.

It means the automation dispatcher has not been told which private GitHub repository contains Elara's automation state.

The automation system is designed like this:

```text
GitHub Actions
    |
    +--> automation-dispatcher.mjs
             |
             +--> private GitHub state repository
             |       +-- automations.json
             |       +-- runtime.json
             |
             +--> automation-executor.mjs
```

The Cloudflare Workers are a separate runtime plane.

### 4.1 Create the private automation state repository

Create a new **private** GitHub repository.

Recommended name:

```text
Elara-private-state
```

Create it here:

https://github.com/new

Set:

```text
Repository name: Elara-private-state
Visibility: Private
```

Do not put application source code in this repository.

It exists only for Elara's personal automation state.

### 4.2 Add the automation state files

The intended state files are:

```text
automations.json
runtime.json
```

The schema is documented here:

https://github.com/cryogenized-spec/Elara-companion-app-v2/blob/main/automation-state/schema.json

The architecture is documented here:

https://github.com/cryogenized-spec/Elara-companion-app-v2/blob/main/automation-state/README.md

If the private repository is empty, do not invent random JSON structures. Use the schema and ask for help if the first state file needs to be bootstrapped.

### 4.3 Create a GitHub token for the automation state repository

Go here:

https://github.com/settings/personal-access-tokens

Create a **fine-grained personal access token**.

Give it access only to the private `Elara-private-state` repository.

The automation requires Contents read/write access to that repository because the dispatcher and executor read and update `automations.json` and `runtime.json`.

Do not paste the token into Git source code.

Do not put the token into the public repository.

### 4.4 Put the state repository name into GitHub Actions Variables

Open the Elara V2 repository.

Go to:

```text
Settings
→ Secrets and variables
→ Actions
→ Variables
```

Direct link:

https://github.com/cryogenized-spec/Elara-companion-app-v2/settings/variables/actions

Click:

```text
New repository variable
```

Enter:

```text
Name: ELARA_STATE_REPO
Value: cryogenized-spec/Elara-private-state
```

Use your exact GitHub owner/repository name if different.

Do **not** put the token here. `ELARA_STATE_REPO` is configuration, not a secret.

### 4.5 Put the state token into GitHub Actions Secrets

On the same GitHub Actions settings page, switch to:

```text
Secrets
```

Direct link:

https://github.com/cryogenized-spec/Elara-companion-app-v2/settings/secrets/actions

Click:

```text
New repository secret
```

Enter:

```text
Name: ELARA_STATE_TOKEN
Secret: <paste the fine-grained GitHub token here>
```

GitHub stores Actions secrets specifically for sensitive values such as API keys and authentication tokens. ([GitHub Secrets](https://docs.github.com/en/actions/concepts/security/secrets))

### 4.6 Test the dispatcher from GitHub Actions

Open:

https://github.com/cryogenized-spec/Elara-companion-app-v2/actions

Find:

```text
Elara Automation Dispatcher
```

Choose:

```text
Run workflow
```

Leave `automation_id` empty for the normal scheduler test unless you specifically want to test one automation.

Run the workflow.

If it fails, open the failed run and copy the error message. Do **not** copy secret values.

## 5. Configure Gemini

Elara uses Gemini as its AI model provider.

### 5.1 Get a Gemini API key

Open Google AI Studio:

https://aistudio.google.com/app/apikey

Create or select an API key.

Treat the key as a password.

Do not put it into GitHub Variables.

Do not put it into the browser.

Do not commit it to `.env.example`.

### 5.2 Local Gemini configuration

In your local root `.env`, use the variable name:

```text
GEMINI_API_KEY=PASTE_YOUR_KEY_HERE
```

The repository's `.env.example` documents the same variable. fileciteturn15file0

### 5.3 GitHub Actions Gemini configuration

Open:

https://github.com/cryogenized-spec/Elara-companion-app-v2/settings/secrets/actions

Add:

```text
Secret name: GEMINI_API_KEY
Secret value: <your Gemini API key>
```

The executor workflow already expects `GEMINI_API_KEY` as a GitHub Actions secret.

### 5.4 Gemini model

The current repository uses a Gemini model setting through:

```text
GEMINI_MODEL
```

This is configuration, not a secret.

When needed, set it under GitHub Actions Variables rather than Secrets.

The application also has runtime defaults, so an omitted model variable does not necessarily mean the application is broken.

## 6. Configure Cloudflare

Cloudflare is used for Elara's background runtime and durable Workflow path.

Open:

https://dash.cloudflare.com/

You will need a Cloudflare account with Workers access.

### 6.1 Understand the two Cloudflare Workers

Elara has a background runtime Worker and a Google-auth Worker.

The repository's background runtime is named:

```text
elara-background-runtime
```

The Google-auth deployment uses its own Wrangler configuration.

The repository documents the architecture here:

https://github.com/cryogenized-spec/Elara-companion-app-v2/blob/main/background-runtime/GOOGLE_VAULT_SETUP.md

### 6.2 Create the Google Vault KV namespace

Open the Cloudflare dashboard.

Go to:

```text
Workers & Pages
→ KV
```

Create a KV namespace for Elara's private Google vault.

Cloudflare KV documentation:

https://developers.cloudflare.com/kv/get-started/

The namespace ID is an infrastructure identifier. It is not the same thing as a Google OAuth token.

You will need this ID later for:

```text
GOOGLE_VAULT_KV_NAMESPACE_ID
```

### 6.3 Configure the KV namespace ID in GitHub

The Google-auth deployment workflow expects:

```text
GOOGLE_VAULT_KV_NAMESPACE_ID
```

as a GitHub Actions **Secret** because the workflow substitutes the value into a temporary Wrangler configuration during deployment.

Open:

https://github.com/cryogenized-spec/Elara-companion-app-v2/settings/secrets/actions

Create:

```text
Name: GOOGLE_VAULT_KV_NAMESPACE_ID
Value: <your Cloudflare KV namespace ID>
```

The deployment workflow already uses this exact secret. fileciteturn36file0

### 6.4 Create the Cloudflare API token

Open:

https://dash.cloudflare.com/profile/api-tokens

Create an API token intended for Elara deployment.

Use the narrowest permissions that allow the required Worker deployments.

The repository expects:

```text
CLOUDFLARE_API_TOKEN
```

Store it in GitHub Actions Secrets, not Variables.

Open:

https://github.com/cryogenized-spec/Elara-companion-app-v2/settings/secrets/actions

Add:

```text
Name: CLOUDFLARE_API_TOKEN
Value: <your Cloudflare API token>
```

Cloudflare secrets should be encrypted rather than stored as ordinary plaintext Worker variables. ([Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/))

### 6.5 Find your Cloudflare Account ID

Open the Cloudflare dashboard and select the account that owns your Elara Workers.

The Account ID is shown in the account details / dashboard area.

Store it in GitHub Actions Secrets using:

```text
Name: CLOUDFLARE_ACCOUNT_ID
Value: <your Cloudflare Account ID>
```

The current deployment workflows read `CLOUDFLARE_ACCOUNT_ID` from GitHub Actions. fileciteturn13file0

## 7. Configure Cloudflare Worker Secrets

After the Workers exist, open the relevant Worker in Cloudflare.

Go to:

```text
Workers & Pages
→ Select the Elara Worker
→ Settings
→ Variables and Secrets
```

Cloudflare's current dashboard path for Worker secrets is documented here:

https://developers.cloudflare.com/workers/configuration/secrets/

Click:

```text
Add
→ Secret
```

Do not put sensitive values under ordinary plaintext variables.

### 7.1 Background runtime secret

The background chat Worker needs:

```text
GEMINI_API_KEY
ELARA_BACKGROUND_TOKEN
```

`GEMINI_API_KEY` is the Gemini API credential.

`ELARA_BACKGROUND_TOKEN` is Elara's private token used to authorize requests to the background runtime.

Create `ELARA_BACKGROUND_TOKEN` as a strong random secret. Do not reuse your GitHub password or another service password.

The repository's Cloudflare Worker checks this token before accepting background-runtime requests.

### 7.2 Google auth Worker secrets/configuration

The Google OAuth Worker needs:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI
ELARA_BACKGROUND_TOKEN
```

The client ID is configuration.

The client secret is a secret.

The redirect URI is configuration, but it must exactly match the redirect URI registered in Google Cloud.

The same `ELARA_BACKGROUND_TOKEN` must be used by the Workers that belong to this private single-user control plane. The repository documentation explicitly describes this requirement. fileciteturn27file0

## 8. Configure Google OAuth

Google OAuth is separate from the Gemini API key.

Do not confuse these two.

### 8.1 Open Google Cloud Console

https://console.cloud.google.com/

Create or select the Google Cloud project used by Elara.

### 8.2 Enable the APIs Elara needs

Use:

```text
APIs & Services
→ Library
```

Enable the Google APIs required by the Workspace features you actually use.

Do not enable everything blindly.

The repository's Google tool surface should be treated as the source of truth for what Elara actually calls.

### 8.3 Create the OAuth client

Open:

```text
APIs & Services
→ Credentials
```

Create an OAuth client ID for a Web application.

Google Cloud credentials documentation:

https://console.cloud.google.com/apis/credentials

Choose:

```text
Application type: Web application
```

Google will provide:

```text
Client ID
Client secret
```

### 8.4 Add the redirect URI

The redirect URI must point to the deployed Google-auth Worker.

The repository's setup guide uses this pattern:

```text
https://elara-google-auth.<your-subdomain>.workers.dev/google/callback
```

Register that exact URI in the Google OAuth client.

Do not add a guessed URI.

Do not add an HTTP URI if the Worker is deployed over HTTPS.

The repository's detailed Google vault instructions are here:

https://github.com/cryogenized-spec/Elara-companion-app-v2/blob/main/background-runtime/GOOGLE_VAULT_SETUP.md

## 9. Put the Google OAuth values into Cloudflare

Open the Google-auth Worker in Cloudflare.

Go to:

```text
Settings
→ Variables and Secrets
```

Add the following.

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI
ELARA_BACKGROUND_TOKEN
```

Use **Secret** for:

```text
GOOGLE_OAUTH_CLIENT_SECRET
ELARA_BACKGROUND_TOKEN
```

Use normal configuration/variable storage for:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_REDIRECT_URI
```

Cloudflare's Worker environment-variable documentation explains the distinction between normal variables and encrypted secrets. ([Cloudflare environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/), [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/))

## 10. Deploy the Cloudflare background runtime

The deployment workflow is already present in:

```text
.github/workflows/deploy-background-runtime.yml
```

Open it here:

https://github.com/cryogenized-spec/Elara-companion-app-v2/blob/main/.github/workflows/deploy-background-runtime.yml

The workflow uses:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

from GitHub Actions Secrets.

Before deploying, fix the KV namespace ID in:

```text
background-runtime/wrangler.jsonc
```

The current file contains a placeholder:

```text
REPLACE_WITH_GOOGLE_VAULT_KV_NAMESPACE_ID
```

Do not leave that placeholder in a real deployment configuration.

The repository's Google vault documentation explains this requirement:

https://github.com/cryogenized-spec/Elara-companion-app-v2/blob/main/background-runtime/GOOGLE_VAULT_SETUP.md

## 11. Deploy the Google-auth Worker

The workflow is:

```text
.github/workflows/deploy-google-auth.yml
```

Open it here:

https://github.com/cryogenized-spec/Elara-companion-app-v2/blob/main/.github/workflows/deploy-google-auth.yml

It expects:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
GOOGLE_VAULT_KV_NAMESPACE_ID
```

The workflow replaces the KV namespace placeholder automatically during deployment. fileciteturn36file0

Run it from:

https://github.com/cryogenized-spec/Elara-companion-app-v2/actions

Select:

```text
Deploy Elara Google Auth Worker
→ Run workflow
```

## 12. Test Google OAuth

After the Google-auth Worker is deployed, the repository's intended endpoints are:

```text
/google/connect
/google/callback
/google/status
/google/access
/google/disconnect
```

The connection flow starts at:

```text
https://<your-google-auth-worker>/google/connect
```

The Worker redirects to Google.

Google returns to:

```text
https://<your-google-auth-worker>/google/callback
```

Do not expect Google OAuth to work until the redirect URI in Google Cloud exactly matches the Worker callback URL.

## 13. Configure the automation executor

Once the private state repository exists, the executor requires these GitHub Actions values:

### Secrets

```text
ELARA_STATE_TOKEN
GEMINI_API_KEY
ELARA_GOOGLE_TOKEN
```

### Variables

```text
ELARA_STATE_REPO
GEMINI_MODEL
```

`ELARA_GOOGLE_TOKEN` is a sensitive automation credential. Treat it as a secret.

The current executor workflow passes the required values into `scripts/automation-executor.mjs`. fileciteturn7file0

## 14. Know which values are secret and which are not

### Treat these as secrets

```text
GEMINI_API_KEY
GOOGLE_OAUTH_CLIENT_SECRET
CLOUDFLARE_API_TOKEN
ELARA_BACKGROUND_TOKEN
ELARA_STATE_TOKEN
ELARA_GOOGLE_TOKEN
```

### Treat these as configuration / identifiers

```text
GEMINI_MODEL
APP_URL
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_REDIRECT_URI
GOOGLE_VAULT_KV_NAMESPACE_ID
CLOUDFLARE_ACCOUNT_ID
ELARA_STATE_REPO
```

### Treat these as runtime/job values, not reusable credentials

```text
AUTOMATION_ID
EXECUTION_KEY
GITHUB_REPOSITORY
GITHUB_SERVER_URL
GITHUB_RUN_ID
```

These classifications come from the repository's current Lockbox manifest. fileciteturn35file0

## 15. Never do these things

Do not commit real secrets to Git.

Do not put API keys or private tokens into `VITE_*` variables.

Do not put secrets into `config/lockbox.manifest.json`.

Do not put secrets into `.env.example`.

Do not paste secrets into GitHub Issues, pull requests, commits, README files, or source code.

Do not put sensitive values into Cloudflare plaintext `vars`.

Do not send a full secret to someone asking for troubleshooting. Send only the variable name and the exact error.

Do not reuse passwords as service tokens.

## 16. If you do not know what a value means, stop

Do not guess.

Use the Lockbox to identify the value.

Then use this guide to find where that value is created.

For example:

```text
I see: ELARA_STATE_REPO

Meaning:
Private GitHub repository containing automation state.

Get it from:
GitHub repository name.

Put it in:
GitHub Actions → Variables.
```

Or:

```text
I see: CLOUDFLARE_API_TOKEN

Meaning:
Credential allowing GitHub Actions to deploy Cloudflare Workers.

Get it from:
Cloudflare → Profile → API Tokens.

Put it in:
GitHub Actions → Secrets.
```

Or:

```text
I see: GOOGLE_OAUTH_CLIENT_SECRET

Meaning:
Google OAuth secret for the Elara Google-auth Worker.

Get it from:
Google Cloud → APIs & Services → Credentials.

Put it in:
Cloudflare Worker → Settings → Variables and Secrets → Secret.
```

## 17. Quick setup order

Follow these steps in this order.

1. Open the Elara V2 repository.
2. Read this file once.
3. Create the private `Elara-private-state` repository.
4. Create the fine-grained GitHub token for that repository.
5. Add `ELARA_STATE_REPO` as a GitHub Actions Variable.
6. Add `ELARA_STATE_TOKEN` as a GitHub Actions Secret.
7. Obtain the Gemini API key from Google AI Studio.
8. Add `GEMINI_API_KEY` to local `.env` for local development.
9. Add `GEMINI_API_KEY` to GitHub Actions Secrets.
10. Create the Cloudflare KV namespace.
11. Record its namespace ID.
12. Add `GOOGLE_VAULT_KV_NAMESPACE_ID` to GitHub Actions Secrets.
13. Create the Cloudflare API token.
14. Add `CLOUDFLARE_API_TOKEN` to GitHub Actions Secrets.
15. Find the Cloudflare Account ID.
16. Add `CLOUDFLARE_ACCOUNT_ID` to GitHub Actions Secrets.
17. Create the Google OAuth Web application credentials.
18. Register the exact Google-auth Worker callback URL in Google Cloud.
19. Configure the Google-auth Worker secrets and variables in Cloudflare.
20. Configure `GEMINI_API_KEY` and `ELARA_BACKGROUND_TOKEN` on the background runtime Worker.
21. Fix the KV namespace placeholder in the background runtime deployment configuration.
22. Deploy the Google-auth Worker.
23. Deploy the background runtime Worker.
24. Run the Elara Automation Dispatcher workflow.
25. Run the Elara application locally.
26. Run `npm run lint`, `npm test`, and `npm run build`.

Do not skip steps just because a later component looks unrelated. Elara has multiple security boundaries by design.

## 18. Useful official links

### GitHub

GitHub Actions secrets:
https://docs.github.com/en/actions/concepts/security/secrets

GitHub Actions variables:
https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables

GitHub personal access tokens:
https://github.com/settings/personal-access-tokens

Elara V2 Actions:
https://github.com/cryogenized-spec/Elara-companion-app-v2/actions

Elara V2 Actions Secrets:
https://github.com/cryogenized-spec/Elara-companion-app-v2/settings/secrets/actions

Elara V2 Actions Variables:
https://github.com/cryogenized-spec/Elara-companion-app-v2/settings/variables/actions

### Google

Google AI Studio API keys:
https://aistudio.google.com/app/apikey

Google Cloud Console:
https://console.cloud.google.com/

Google Cloud credentials:
https://console.cloud.google.com/apis/credentials

### Cloudflare

Cloudflare dashboard:
https://dash.cloudflare.com/

Cloudflare API tokens:
https://dash.cloudflare.com/profile/api-tokens

Workers documentation:
https://developers.cloudflare.com/workers/

Worker secrets:
https://developers.cloudflare.com/workers/configuration/secrets/

Worker environment variables:
https://developers.cloudflare.com/workers/configuration/environment-variables/

Cloudflare KV:
https://developers.cloudflare.com/kv/get-started/

## 19. When to come back for help

When something fails, send:

1. The command you ran.
2. The full error message.
3. The file name mentioned in the error.
4. The step number from this guide you were following.

Do **not** send the secret value itself.

Examples of useful messages:

```text
Step 10 failed.
I created the Cloudflare KV namespace, but I don't know which value is the namespace ID.
```

```text
The dispatcher now says HTTP 404 when reading automations.json from the private state repository.
```

```text
Cloudflare deployment says GOOGLE_VAULT_KV is missing.
```

That is enough information to diagnose the problem safely.

## 20. Detailed technical documents

Use these when you need deeper information.

- [`docs/LOCKBOX.md`](./LOCKBOX.md) — credential boundaries and security policy.
- [`docs/LOCKBOX_VERIFICATION.md`](./LOCKBOX_VERIFICATION.md) — Lockbox verification.
- [`background-runtime/GOOGLE_VAULT_SETUP.md`](../background-runtime/GOOGLE_VAULT_SETUP.md) — Google OAuth vault and Cloudflare KV setup.
- [`automation-state/README.md`](../automation-state/README.md) — private automation state design.
- [`automation-state/schema.json`](../automation-state/schema.json) — automation state schema.
- [`background-runtime/wrangler.jsonc`](../background-runtime/wrangler.jsonc) — background Worker deployment configuration.
- [`.github/workflows/elara-automation-dispatcher.yml`](../.github/workflows/elara-automation-dispatcher.yml) — automation dispatcher workflow.
- [`.github/workflows/elara-automation-executor.yml`](../.github/workflows/elara-automation-executor.yml) — automation executor workflow.
- [`.github/workflows/deploy-background-runtime.yml`](../.github/workflows/deploy-background-runtime.yml) — background Worker deployment.
- [`.github/workflows/deploy-google-auth.yml`](../.github/workflows/deploy-google-auth.yml) — Google-auth Worker deployment.

## Final rule

When in doubt, do not guess where a credential belongs.

Find the variable name in the Lockbox.

Find it in this guide.

Follow the numbered instructions.

If the exact screen, field, or error does not match the guide, stop and get help before putting a secret somewhere random.
