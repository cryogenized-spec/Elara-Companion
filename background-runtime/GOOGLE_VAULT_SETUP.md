# Elara server-side Google OAuth vault

This layer moves long-lived Google authorization off the browser so durable Cloudflare jobs can operate when the user is not present.

Google authorization uses the OAuth 2.0 authorization-code flow with `access_type=offline`. The backend receives and stores the refresh token; the browser does not receive or persist that refresh token.

## Cloudflare components

Create one Workers KV namespace and bind it to the background runtime and the `elara-google-auth` Worker as `GOOGLE_VAULT_KV`.

Keep these as Worker secrets:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `ELARA_BACKGROUND_TOKEN`

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

`/google/disconnect` revokes the stored refresh token and removes it from KV.

The durable agent should obtain a short-lived access token on demand from the vault and must never put the refresh token into a Workflow payload or browser storage.
