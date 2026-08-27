# Backend trust boundary

The Express server is not treated as a public anonymous API.

Production requests to AI, memory, audio, Google Chat, webhook, and Workspace routes require `Authorization: Bearer <ELARA_SERVER_ACCESS_TOKEN>`. Production CORS is allow-listed through `ELARA_ALLOWED_ORIGINS`; wildcard `*` access is not permitted.

The public/static deployment remains the preferred unauthenticated browser surface. Browser-direct Gemini execution remains available for static hosting, so the backend token is never embedded in frontend assets.

Local development keeps the API convenient for localhost origins. A production server without `ELARA_SERVER_ACCESS_TOKEN` fails closed with HTTP 503 for protected routes rather than silently operating without authentication.

A future user-facing authenticated backend mode may replace this shared-token boundary with a real session/identity layer. Until then, do not expose the Express API anonymously on the public Internet.
