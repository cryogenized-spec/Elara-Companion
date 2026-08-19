import {
  buildGoogleAuthorizationUrl,
  clearGoogleVault,
  consumeOAuthState,
  createOAuthState,
  exchangeAuthorizationCode,
  getGoogleConnectionStatus,
  type GoogleVaultEnv,
} from './googleVault';

function html(message: string, status = 200): Response {
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elara Google Workspace</title></head><body style="font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;display:grid;place-items:center;min-height:100vh;padding:24px"><main style="max-width:560px;text-align:center"><h1>Elara Google Workspace</h1><p>${message}</p><button onclick="window.close()" style="margin-top:16px;padding:10px 16px;border-radius:10px">Close</button></main></body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function handleGoogleOAuthRoute(request: Request, env: GoogleVaultEnv, path: string): Promise<Response | null> {
  if (request.method === 'GET' && path === '/google/connect') {
    const state = await createOAuthState(env);
    return Response.redirect(buildGoogleAuthorizationUrl(env, state), 302);
  }

  if (request.method === 'GET' && path === '/google/callback') {
    const url = new URL(request.url);
    const error = url.searchParams.get('error');
    if (error) return html(`Google authorization was not completed: ${error}`, 400);

    const state = url.searchParams.get('state') || '';
    const code = url.searchParams.get('code') || '';
    if (!(await consumeOAuthState(env, state))) return html('The authorization request expired or was invalid. Please start again.', 400);
    if (!code) return html('Google did not return an authorization code.', 400);

    try {
      await exchangeAuthorizationCode(env, code);
      return html('Google Workspace is now connected. You can close this window and return to Elara.');
    } catch (authError: any) {
      return html(`Google authorization failed: ${authError?.message || 'Unknown error'}`, 500);
    }
  }

  if (request.method === 'GET' && path === '/google/status') {
    return Response.json(await getGoogleConnectionStatus(env));
  }

  if (request.method === 'POST' && path === '/google/disconnect') {
    await clearGoogleVault(env);
    return Response.json({ connected: false });
  }

  return null;
}
