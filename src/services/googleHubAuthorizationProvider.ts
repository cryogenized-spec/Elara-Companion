import type { GoogleCapability } from '../contracts';
import type { GoogleHubCapabilityDescriptor } from '../contracts/googleHub';
import { googleCapabilities, googleIdentity } from './googleWorkspaceService';
import { createGoogleHubAuthorizationState } from './googleHubAuthorizationService';

/** Canonical provider adapter. Keeps credentials/provider state out of the Hub contract. */
export function createCanonicalGoogleHubAuthorizationState(
  capabilities: readonly GoogleHubCapabilityDescriptor[],
  now: () => number = Date.now,
) {
  return createGoogleHubAuthorizationState(
    capabilities,
    () => googleIdentity.isAuthorized(),
    (capability: GoogleCapability) =>
      googleCapabilities.isGranted(googleCapabilities.getGrantedScopes(), capability),
    now,
  );
}
