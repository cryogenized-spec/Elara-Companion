# Elara Durable Background Runtime

This is the optional server-side execution layer for Elara when the frontend is hosted on GitHub Pages.

It uses Cloudflare Workers + Workflows. The browser submits a job, receives a stable job ID, and the Workflow owns the Gemini request. The browser may then be closed, suspended, or navigated away from without cancelling the job.

## Free-tier target

Cloudflare currently provides a Workers Free plan with 100,000 requests/day. Workflows are available on the Free plan and currently include 100,000 workflow executions/day, 3,000 steps/day and 1 GB of workflow state retention. Completed Workflow state is retained for 3 days on Free. See the current Cloudflare documentation before production use.

## Deploy

Create a free Cloudflare account and install/login with Wrangler:

```bash
cd background-runtime
npm install
npx wrangler login
```

Set the two secrets:

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ELARA_BACKGROUND_TOKEN
```

`ELARA_BACKGROUND_TOKEN` is a personal-use bearer token shared with the Elara Pages frontend. It is intentionally simple for the single-user stage of the project. It should not be treated as a multi-user authentication system.

Deploy:

```bash
npx wrangler deploy
```

The resulting Worker URL will look like:

`https://elara-background-runtime.<your-subdomain>.workers.dev`

## API

`POST /jobs` creates a durable chat job.

`GET /jobs/:id` returns Workflow status and, once complete, the generated response.

All requests require:

```text
Authorization: Bearer <ELARA_BACKGROUND_TOKEN>
```

The browser payload contains the already-built Elara system prompt, conversation history, current message and model settings. The API key stays server-side in Cloudflare and is never shipped to the browser.

## Current scope

This first durable slice executes the Gemini response itself. Local Workspace tools, Google Workspace writes, background artifact persistence and Web Push delivery remain separate follow-up integrations. Keeping those concerns out of the initial Workflow makes the durable execution boundary auditable and avoids persisting OAuth tokens in Workflow state.
