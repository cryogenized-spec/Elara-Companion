import type { ToolCapability, ToolEffect, ToolInvocationSource } from '../tools/toolPluginTypes';

export interface ToolExposurePolicy {
  source: ToolInvocationSource;
  availableCapabilities?: readonly ToolCapability[];
  disallowedEffects?: readonly ToolEffect[];
}

export function isToolExposed(
  capabilities: readonly ToolCapability[] = [],
  effects: readonly ToolEffect[] = [],
  policy?: ToolExposurePolicy,
): boolean {
  if (!policy) return true;

  const available = new Set(policy.availableCapabilities || []);
  const blockedEffects = new Set(policy.disallowedEffects || []);

  if (effects.some((effect) => blockedEffects.has(effect))) return false;
  if (capabilities.some((capability) => !available.has(capability))) return false;
  return true;
}
