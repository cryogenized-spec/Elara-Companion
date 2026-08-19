const GOOGLE_AUTH_INVALIDATED = 'elara_google_auth_invalidated_v1';

export type GoogleAuthLifecycleResult = { success: boolean; revoked: boolean; message: string };
let invalidated = false;
export function markGoogleAuthInvalid(): void { invalidated = true; }
export function clearGoogleAuthInvalid(): void { invalidated = false; }
export function isGoogleAuthInvalidated(): boolean { return invalidated; }
export async function revokeGoogleAccessToken(accessToken?: string): Promise<GoogleAuthLifecycleResult> {
  const token = accessToken?.trim();
  if (!token) { invalidated = true; return { success: true, revoked: false, message: 'No active Google access token was present. The local Google session has been invalidated.' }; }
  try {
    const response = await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `token=${encodeURIComponent(token)}` });
    invalidated = true;
    if (response.ok) return { success: true, revoked: true, message: 'Google access was revoked and Elara has marked the current Google session as disconnected.' };
    return { success: false, revoked: false, message: `Google token revocation returned HTTP ${response.status}. The local session has still been invalidated. Re-authorize Google Workspace before using it again.` };
  } catch (error: any) {
    invalidated = true;
    return { success: false, revoked: false, message: `Google token revocation could not be completed: ${String(error?.message || error || 'network error')}. The local session has still been invalidated.` };
  }
}
export const GOOGLE_AUTH_INVALIDATION_KEY = GOOGLE_AUTH_INVALIDATED;
