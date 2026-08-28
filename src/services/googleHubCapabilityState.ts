import type { GoogleCapability } from '../contracts';
import type { GoogleHubCapabilityDescriptor, GoogleHubCapabilityStatus } from '../contracts/googleHub';

export interface GoogleHubActionAvailability {
  id: string;
  label: string;
  available: boolean;
  requiredCapabilities: readonly GoogleCapability[];
}

export interface GoogleHubCapabilityState {
  id: string;
  status: GoogleHubCapabilityStatus;
  baseEnabled: boolean;
  actions: readonly GoogleHubActionAvailability[];
  enabledActions: readonly string[];
  blockedActions: readonly string[];
  missingBaseCapabilities: readonly GoogleCapability[];
}

function requirementsFor(descriptor: GoogleHubCapabilityDescriptor, actionId: string): readonly GoogleCapability[] {
  return descriptor.actionRequirements?.[actionId] ?? descriptor.requiredCapabilities;
}

function isNonProviderAction(kind: GoogleHubCapabilityDescriptor['actions'][number]['kind']): boolean {
  return kind === 'open' || kind === 'ask' || kind === 'enable';
}

export function projectGoogleHubCapabilityState(
  descriptor: GoogleHubCapabilityDescriptor,
  grantedCapabilities: ReadonlySet<GoogleCapability>,
  authorized: boolean,
): GoogleHubCapabilityState {
  const baseEnabled = descriptor.requiredCapabilities.length > 0
    && descriptor.requiredCapabilities.every((capability) => grantedCapabilities.has(capability));
  const missingBaseCapabilities = descriptor.requiredCapabilities.filter((capability) => !grantedCapabilities.has(capability));
  const actions = descriptor.actions.map((action) => {
    const requiredCapabilities = requirementsFor(descriptor, action.id);
    const available = isNonProviderAction(action.kind)
      || requiredCapabilities.length === 0
      || requiredCapabilities.every((capability) => grantedCapabilities.has(capability));
    return { id: action.id, label: action.label, available, requiredCapabilities };
  });
  const actionable = actions.filter((action) => !isNonProviderAction(descriptor.actions.find((candidate) => candidate.id === action.id)?.kind ?? 'open'));
  const status: GoogleHubCapabilityStatus = !authorized
    ? 'unavailable'
    : !baseEnabled
      ? 'needs-access'
      : actionable.some((action) => !action.available)
        ? 'limited'
        : 'enabled';

  return {
    id: descriptor.id,
    status,
    baseEnabled,
    actions,
    enabledActions: actions.filter((action) => action.available).map((action) => action.label),
    blockedActions: actions.filter((action) => !action.available).map((action) => action.label),
    missingBaseCapabilities,
  };
}

export function projectGoogleHubCapabilityStates(
  descriptors: readonly GoogleHubCapabilityDescriptor[],
  grantedCapabilities: readonly GoogleCapability[],
  authorized: boolean,
): readonly GoogleHubCapabilityState[] {
  const granted = new Set(grantedCapabilities);
  return descriptors.map((descriptor) => projectGoogleHubCapabilityState(descriptor, granted, authorized));
}
