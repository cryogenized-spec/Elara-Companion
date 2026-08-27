import type { GoogleCapability } from './index';
import type { GoogleHubAuthorizationStateContract, GoogleHubAuthorizationSnapshot, GoogleHubAuthorizationStatus } from './googleHubAuthorization';

export type GoogleHubCategory =
  | 'communication'
  | 'scheduling'
  | 'files'
  | 'documents'
  | 'data'
  | 'tasks'
  | 'notes'
  | 'people'
  | 'collaboration';

export type GoogleHubCapabilityId =
  | 'gmail'
  | 'calendar'
  | 'drive'
  | 'docs'
  | 'sheets'
  | 'tasks'
  | 'keep'
  | 'contacts'
  | 'chat';

export type GoogleHubCapabilityStatus = 'enabled' | 'available' | 'unavailable' | 'error';

export interface GoogleHubCapabilityAction {
  id: string;
  label: string;
  kind: 'open' | 'create' | 'search' | 'sync' | 'manage' | 'ask' | 'enable';
  requiresConfirmation?: boolean;
  destructive?: boolean;
}

/** Provider-neutral descriptor used by the Google Hub composition layer. */
export interface GoogleHubCapabilityDescriptor {
  id: GoogleHubCapabilityId;
  name: string;
  description: string;
  category: GoogleHubCategory;
  iconKey: string;
  requiredCapabilities: readonly GoogleCapability[];
  externalUrl?: string;
  panelKey: string;
  actions: readonly GoogleHubCapabilityAction[];
}

export interface GoogleHubCapabilityRegistry {
  register(descriptor: GoogleHubCapabilityDescriptor): void;
  unregister(id: GoogleHubCapabilityId): void;
  get(id: GoogleHubCapabilityId): GoogleHubCapabilityDescriptor | undefined;
  has(id: GoogleHubCapabilityId): boolean;
  list(): readonly GoogleHubCapabilityDescriptor[];
  listByCategory(category: GoogleHubCategory): readonly GoogleHubCapabilityDescriptor[];
}

export type {
  GoogleHubAuthorizationStateContract,
  GoogleHubAuthorizationSnapshot,
  GoogleHubAuthorizationStatus,
};
