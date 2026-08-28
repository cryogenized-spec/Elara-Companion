import type { GoogleCapability } from './index';
import type { GoogleHubAuthorizationStateContract, GoogleHubAuthorizationSnapshot, GoogleHubAuthorizationStatus } from './googleHubAuthorization';

export type GoogleHubCategory = 'communication' | 'scheduling' | 'files' | 'documents' | 'data' | 'tasks' | 'notes' | 'people' | 'collaboration';

/** Runtime-extensible identifier. The registry is the authority for known capabilities. */
export type GoogleHubCapabilityId = string;
export type GoogleHubCapabilityStatus = 'enabled' | 'limited' | 'needs-access' | 'unavailable' | 'error';

export interface GoogleHubCapabilityAction {
  id: string;
  label: string;
  kind: 'open' | 'create' | 'search' | 'sync' | 'manage' | 'ask' | 'enable';
  requiresConfirmation?: boolean;
  destructive?: boolean;
}

export interface GoogleHubCapabilityDescriptor {
  id: GoogleHubCapabilityId;
  name: string;
  description: string;
  category: GoogleHubCategory;
  iconKey: string;
  requiredCapabilities: readonly GoogleCapability[];
  actionRequirements?: Partial<Record<string, readonly GoogleCapability[]>>;
  permissionDescription?: string;
  dataAccessDescription?: string;
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

export type { GoogleHubAuthorizationStateContract, GoogleHubAuthorizationSnapshot, GoogleHubAuthorizationStatus };
