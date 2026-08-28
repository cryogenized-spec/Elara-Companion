import type { GoogleCapability } from '../contracts';
import type {
  GoogleHubAuthorizationSnapshot,
  GoogleHubAuthorizationStateContract,
  GoogleHubAuthorizationStatus,
  GoogleHubCapabilityDescriptor,
} from '../contracts/googleHub';

/**
 * Projects provider authorization into a token-free application state.
 * The provider remains responsible for obtaining/holding credentials.
 */
export function createGoogleHubAuthorizationState(
  capabilities: readonly GoogleHubCapabilityDescriptor[],
  isAuthorized: () => boolean,
  isCapabilityGranted: (capability: GoogleCapability) => boolean,
  now: () => number = Date.now,
): GoogleHubAuthorizationStateContract {
  function snapshot(): GoogleHubAuthorizationSnapshot {
    const requiredCapabilities = uniqueCapabilities(
      capabilities.flatMap((descriptor) => descriptor.requiredCapabilities),
    );
    const grantedCapabilities = requiredCapabilities.filter(isCapabilityGranted);
    const missingCapabilities = requiredCapabilities.filter((capability) => !isCapabilityGranted(capability));
    const authorized = isAuthorized();

    let status: GoogleHubAuthorizationStatus = 'unknown';
    if (authorized && missingCapabilities.length === 0) {
      status = 'authorized';
    } else if (authorized) {
      status = 'partially-authorized';
    } else {
      status = 'unauthorized';
    }

    return {
      status,
      authorized,
      grantedCapabilities,
      missingCapabilities,
      updatedAt: now(),
    };
  }

  return {
    snapshot,
    isCapabilityGranted,
  };
}

function uniqueCapabilities(capabilities: readonly GoogleCapability[]): GoogleCapability[] {
  return Array.from(new Set(capabilities));
}
