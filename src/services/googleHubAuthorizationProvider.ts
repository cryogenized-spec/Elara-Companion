import type { GoogleCapability } from '../contracts';
import type { GoogleHubCapabilityDescriptor } from '../contracts/googleHub';
import { googleCapabilities, googleIdentity } from './googleWorkspaceService';
import { createGoogleHubAuthorizationState } from './googleHubAuthorizationService';

/**
 * Canonical adapter between the provider's credential/authorization implementation
 * and the token-free Google Hub authorization projection.
 *
 * The Hub consumes this state; it never reads an access token or provider globals.
 */
export function createCanonicalGoogleHubAuthorizationState(
  capabilities: readonly GoogleHubCapabilityDescriptor[],
  now: () => number = Date.now,
) {
  return createGoogleHubAuthorizationState(
    capabilities,
    () => googleIdentity.isAuthorized(),
    (capability: GoogleCapability) => googleCapabilities.isGranted(googleCapabilities.getGrantedScopes(), capability),
    now,
  );
}
