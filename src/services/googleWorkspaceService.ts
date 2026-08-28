import {
  getGrantedGoogleScopes,
  getGoogleAuthorizationClientId,
  getGoogleAuthorizationState,
  getGoogleBaseScopes,
  getGoogleIdentityAccessToken,
  initGoogleBaseAuthorization,
  isGoogleIdentityAuthorized,
  requestGoogleBaseAuthorization,
  requestGoogleCapabilityAuthorization,
  revokeGoogleBaseAuthorization,
  setCustomGoogleClientId,
} from '../lib/googleAuthorization';
import {
  getGoogleCapabilityScopes,
  isGoogleCapabilityGranted,
  type GoogleCapability,
} from '../lib/googleCapabilityPolicy';

export type { GoogleCapability };

export const googleIdentity = {
  getClientId: getGoogleAuthorizationClientId,
  getState: getGoogleAuthorizationState,
  getBaseScopes: getGoogleBaseScopes,
  getAccessToken: getGoogleIdentityAccessToken,
  isAuthorized: isGoogleIdentityAuthorized,
  init: initGoogleBaseAuthorization,
  requestBaseAuthorization: requestGoogleBaseAuthorization,
  requestCapabilityAuthorization: requestGoogleCapabilityAuthorization,
  revoke: revokeGoogleBaseAuthorization,
  setCustomClientId: setCustomGoogleClientId,
  getAccountEmail,
};

export const googleCapabilities = {
  getScopes: getGoogleCapabilityScopes,
  isGranted: isGoogleCapabilityGranted,
  getGrantedScopes: getGrantedGoogleScopes,
};

/** Provider-backed identity lookup. Credentials remain inside the provider layer. */
async function getAccountEmail(): Promise<string | null> {
  const token = getGoogleIdentityAccessToken();
  if (!token) return null;
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const payload = await response.json() as { email?: string };
  return payload.email || null;
}

/** Application-facing Google credential access. This is the only canonical token source. */
export function getGoogleAgentAccessToken(): string {
  return getGoogleIdentityAccessToken();
}
