import type { GoogleCapability } from '../lib/googleCapabilityPolicy';

/** Provider identifier used by integration capability modules. */
export type CapabilityProvider = 'google' | (string & {});

/**
 * The kind of user-visible operation a capability can expose.
 * These are descriptive metadata; execution remains owned by the provider service.
 */
export type CapabilityActionKind = 'query' | 'create' | 'update' | 'delete' | 'external' | 'authorize';
export type CapabilityActionEffect = 'read' | 'write' | 'external-write' | 'auth-change';
export type CapabilityConfirmation = 'none' | 'user';
export type CapabilityAuthorizationMode = 'identity' | 'capability';

export interface CapabilityAction {
  id: string;
  label: string;
  description: string;
  kind: CapabilityActionKind;
  effect: CapabilityActionEffect;
  requiredCapabilities?: readonly GoogleCapability[];
  confirmation?: CapabilityConfirmation;
}

/** Stable, provider-facing contract for an integration capability. */
export interface IntegrationCapability {
  id: string;
  version: 1;
  provider: CapabilityProvider;
  name: string;
  description: string;
  category: string;
  iconKey: string;
  panelKey: string;
  authorization: {
    mode: CapabilityAuthorizationMode;
    requiredCapabilities: readonly GoogleCapability[];
  };
  externalUrl?: string;
  actions: readonly CapabilityAction[];
}

/** Google Hub capability definition. Scope strings are deliberately not duplicated here. */
export type GoogleCapabilityDefinition = Omit<IntegrationCapability, 'provider' | 'authorization'> & {
  provider: 'google';
  authorization: IntegrationCapability['authorization'];
};
