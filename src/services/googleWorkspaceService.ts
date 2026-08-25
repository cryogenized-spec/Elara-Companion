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
};

export const googleCapabilities = {
  getScopes: getGoogleCapabilityScopes,
  isGranted: isGoogleCapabilityGranted,
  getGrantedScopes: getGrantedGoogleScopes,
};

/** Application-facing Google credential access. This is the only canonical token source. */
export function getGoogleAgentAccessToken(): string {
  return getGoogleIdentityAccessToken();
}
