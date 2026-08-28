import type { GoogleCapability } from './index';

export type GoogleHubAuthorizationStatus =
  | 'authorized'
  | 'partially-authorized'
  | 'unauthorized'
  | 'unknown';

/** UI-safe authorization projection. Deliberately contains no access token or secret material. */
export interface GoogleHubAuthorizationSnapshot {
  status: GoogleHubAuthorizationStatus;
  authorized: boolean;
  grantedCapabilities: readonly GoogleCapability[];
  missingCapabilities: readonly GoogleCapability[];
  updatedAt: number;
}

export interface GoogleHubAuthorizationStateContract {
  snapshot(): GoogleHubAuthorizationSnapshot;
  isCapabilityGranted(capability: GoogleCapability): boolean;
}
