# Elara server-side Google OAuth vault

This layer moves long-lived Google authorization off the browser so durable Cloudflare jobs can operate when the user is not present.

Google authorization uses the OAuth 2.0 authorization-code flow with `access_type=offline`. The backend receives and stores the refresh token; the browser does not receive or persist that refresh token.

## Cloudflare components

Create one Workers KV namespace and bind it to both the background chat Worker and the `elara-google-auth` Worker as `GOOGLE_VAULT_KV`.

For `background-runtime/wrangler.jsonc`, replace:

`REPLACE_WITH_GOOGLE_VAULT_KV_NAMESPACE_ID`

with the real KV namespace ID.

Keep these as Worker secrets:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `ELARA_BACKGROUND_TOKEN`
- `GEMINI_API_KEY` on the chat Worker

`GOOGLE_OAUTH_REDIRECT_URI` must exactly match the Google Cloud OAuth redirect URI and point at the deployed auth Worker, for example:

`https://elara-google-auth.<your-subdomain>.workers.dev/google/callback`

The OAuth connect URL is:

`https://elara-google-auth.<your-subdomain>.workers.dev/google/connect`

## Google Cloud

Use a Web application OAuth client. Add the auth Worker callback URL to Authorized redirect URIs.

The scope set deliberately mirrors Elara's current Google Workspace provider. Review and reduce scopes before a public multi-user release; incremental authorization is preferable when practical.

## Lifecycle

`/google/connect` creates a short-lived state value in KV and redirects to Google.

`/google/callback` validates and consumes that state, exchanges the authorization code, and stores the refresh token in KV.

`/google/status` reports connection state.

`/google/access` returns a fresh short-lived access token to the authenticated background runtime. It is intentionally `no-store` and is not written into Workflow state.

`/google/disconnect` revokes the stored refresh token and removes it from KV.

## Durable tool execution

The durable agent now exposes Google read tools for Calendar, Tasks, Gmail, Drive, and Docs. Each Google tool execution obtains a fresh access token inside a Workflow step, performs the API call, and returns only the tool result to the agent. The access token and refresh token are not returned as Workflow output.

Local artifact tools remain available in the same durable function-calling loop.

## Google writes

Durable Google writes are intentionally not auto-authorized. The model must never self-authorize a write simply by emitting `userConfirmed: true`. A future confirmation-card/approval grant will create the server-side authorization record needed for durable Google writes.

## Deployment

Deploy the Google auth Worker first, then deploy the background chat Worker. Both Workers must reference the same KV namespace and the same `ELARA_BACKGROUND_TOKEN` for their private single-user control plane.
