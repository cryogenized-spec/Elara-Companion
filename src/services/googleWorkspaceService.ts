import {
  getGrantedGoogleScopes,
  getGoogleAuthorizationClientId,
  getGoogleBaseScopes,
  getGoogleIdentityAccessToken,
  initGoogleBaseAuthorization,
  isGoogleIdentityAuthorized,
  requestGoogleBaseAuthorization,
  requestGoogleCapabilityAuthorization,
  revokeGoogleBaseAuthorization,
} from '../lib/googleAuthorization';
import { getAccessToken } from '../lib/googleApi';
import {
  getGoogleCapabilityScopes,
  isGoogleCapabilityGranted,
  type GoogleCapability,
} from '../lib/googleCapabilityPolicy';

export type { GoogleCapability };

export const googleIdentity = {
  getClientId: getGoogleAuthorizationClientId,
  getBaseScopes: getGoogleBaseScopes,
  getAccessToken: getGoogleIdentityAccessToken,
  isAuthorized: isGoogleIdentityAuthorized,
  init: initGoogleBaseAuthorization,
  requestBaseAuthorization: requestGoogleBaseAuthorization,
  requestCapabilityAuthorization: requestGoogleCapabilityAuthorization,
  revoke: revokeGoogleBaseAuthorization,
};

export const googleCapabilities = {
  getScopes: getGoogleCapabilityScopes,
  isGranted: isGoogleCapabilityGranted,
  getGrantedScopes: getGrantedGoogleScopes,
};

export function getGoogleAgentAccessToken(): string {
  return getAccessToken();
}
