export * from './capabilityTypes';
export * from './googleCapabilityRegistry';
export { GOOGLE_HUB_CAPABILITIES } from './googleCapabilities';

import { GoogleCapabilityRegistry } from './googleCapabilityRegistry';
import { GOOGLE_HUB_CAPABILITIES } from './googleCapabilities';

/** Create an isolated registry for the default Google Hub capabilities. */
export function createGoogleCapabilityRegistry(): GoogleCapabilityRegistry {
  const registry = new GoogleCapabilityRegistry();
  registry.registerAll(GOOGLE_HUB_CAPABILITIES);
  return registry;
}

/** Shared default registry for read-only metadata consumers. Do not mutate from UI code. */
export const googleCapabilityRegistry = createGoogleCapabilityRegistry();
