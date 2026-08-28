import type { GoogleCapability } from '../lib/googleCapabilityPolicy';

/** Provider identifier used by integration capability modules. */
export type CapabilityProvider = string;

/** The kind of user-visible operation a capability can expose. */
export type CapabilityActionKind = 'query' | 'create' | 'update' | 'delete' | 'external' | 'authorize';
export type CapabilityActionEffect = 'read' | 'write' | 'external-write' | 'auth-change';
export type CapabilityConfirmation = 'none' | 'user';
export type CapabilityAuthorizationMode = 'identity' | 'capability';

export interface CapabilityAction<Permission = string> {
  id: string;
  label: string;
  description: string;
  kind: CapabilityActionKind;
  effect: CapabilityActionEffect;
  requiredPermissions?: readonly Permission[];
  confirmation?: CapabilityConfirmation;
}

/**
 * Provider-neutral capability contract.
 * Permission identifiers belong to the provider adapter rather than the Hub itself.
 */
export interface IntegrationCapability<
  Provider extends CapabilityProvider = CapabilityProvider,
  Permission = string,
> {
  id: string;
  version: 1;
  provider: Provider;
  name: string;
  description: string;
  category: string;
  iconKey: string;
  panelKey: string;
  authorization: {
    mode: CapabilityAuthorizationMode;
    requiredPermissions: readonly Permission[];
  };
  externalUrl?: string;
  actions: readonly CapabilityAction<Permission>[];
}

/** Google Hub specialization backed by the canonical Google OAuth capability policy. */
export type GoogleCapabilityDefinition = IntegrationCapability<'google', GoogleCapability>;
