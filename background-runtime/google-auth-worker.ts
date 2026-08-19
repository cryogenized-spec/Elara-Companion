import {
  buildGoogleAuthorizationUrl,
  clearGoogleVault,
  consumeOAuthState,
  createOAuthState,
  exchangeAuthorizationCode,
  getFreshGoogleAccessToken,
  getGoogleConnectionStatus,
  type GoogleVaultEnv,
} from './googleVault';

function page(message: string, status = 200): Response {
  const safe = message.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elara Google Workspace</title></head><body style="font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;display:grid;place-items:center;min-height:100vh;padding:24px"><main style="max-width:560px;text-align:center"><h1>Elara Google Workspace</h1><p>${safe}</p><button onclick="window.close()" style="margin-top:16px;padding:10px 16px;border-radius:10px">Close</button></main></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function authorized(request: Request, env: GoogleVaultEnv & { ELARA_BACKGROUND_TOKEN: string }): boolean {
  const header = request.headers.get('Authorization') || '';
  return header === `Bearer ${env.ELARA_BACKGROUND_TOKEN}`;
}

export default {
  async fetch(request: Request, env: GoogleVaultEnv & { ELARA_BACKGROUND_TOKEN: string }): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

    if (request.method === 'GET' && path === '/google/connect') {
      const state = await createOAuthState(env);
      return Response.redirect(buildGoogleAuthorizationUrl(env, state), 302);
    }

    if (request.method === 'GET' && path === '/google/callback') {
      const error = url.searchParams.get('error');
      if (error) return page(`Google authorization was not completed: ${error}`, 400);
      const state = url.searchParams.get('state') || '';
      const code = url.searchParams.get('code') || '';
      if (!(await consumeOAuthState(env, state))) return page('The authorization request expired or was invalid. Please start again.', 400);
      if (!code) return page('Google did not return an authorization code.', 400);
      try {
        await exchangeAuthorizationCode(env, code);
        return page('Google Workspace is connected to Elara. You can close this window.');
      } catch (e: any) {
        return page(`Google authorization failed: ${e?.message || 'Unknown error'}`, 500);
      }
    }

    if (!authorized(request, env)) return json({ error: 'Unauthorized.' }, 401);

    if (request.method === 'GET' && path === '/google/status') {
      return json(await getGoogleConnectionStatus(env));
    }

    if (request.method === 'POST' && path === '/google/access') {
      try {
        const accessToken = await getFreshGoogleAccessToken(env);
        return json({ accessToken, tokenType: 'Bearer' });
      } catch (e: any) {
        return json({ error: e?.message || 'Google access token unavailable.' }, 401);
      }
    }

    if (request.method === 'POST' && path === '/google/disconnect') {
      await clearGoogleVault(env);
      return json({ connected: false });
    }

    return json({ error: 'Not found.' }, 404);
  },
};
