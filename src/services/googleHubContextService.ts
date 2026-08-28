import type { GoogleCapability } from '../contracts';
import type { GoogleHubAuthorizationSnapshot, GoogleHubCapabilityDescriptor } from '../contracts/googleHub';

export interface GoogleHubAgentContext {
  provider: 'google';
  accountEmail?: string;
  authorization: Pick<GoogleHubAuthorizationSnapshot, 'status' | 'authorized'> & {
    grantedCapabilities: readonly GoogleCapability[];
    missingCapabilities: readonly GoogleCapability[];
  };
  capabilities: readonly {
    id: string;
    name: string;
    category: string;
    status: 'enabled' | 'limited' | 'needs-access';
    enabledActions: readonly string[];
    blockedActions: readonly string[];
  }[];
  recentActivity: readonly {
    service: string;
    description: string;
    timestamp: number;
  }[];
}

export function buildGoogleHubAgentContext(
  capabilities: readonly GoogleHubCapabilityDescriptor[],
  authorization: GoogleHubAuthorizationSnapshot,
  accountEmail?: string,
  activity: readonly { service: string; description: string; timestamp: number }[] = [],
): GoogleHubAgentContext {
  const granted = new Set(authorization.grantedCapabilities);
  const capabilityState = capabilities.map((descriptor) => {
    const baseEnabled = descriptor.requiredCapabilities.length > 0
      && descriptor.requiredCapabilities.every((capability) => granted.has(capability));
    const actionPairs = descriptor.actions.map((action) => {
      const requirements = descriptor.actionRequirements?.[action.id] ?? descriptor.requiredCapabilities;
      const available = action.kind === 'open'
        || action.kind === 'ask'
        || action.kind === 'enable'
        || requirements.length === 0
        || requirements.every((capability) => granted.has(capability));
      return [action.label, available] as const;
    });
    return {
      id: descriptor.id,
      name: descriptor.name,
      category: descriptor.category,
      status: baseEnabled
        ? (actionPairs.some(([, available]) => !available) ? 'limited' : 'enabled')
        : 'needs-access',
      enabledActions: actionPairs.filter(([, available]) => available).map(([label]) => label),
      blockedActions: actionPairs.filter(([, available]) => !available).map(([label]) => label),
    };
  });

  return {
    provider: 'google',
    accountEmail,
    authorization: {
      status: authorization.status,
      authorized: authorization.authorized,
      grantedCapabilities: authorization.grantedCapabilities,
      missingCapabilities: authorization.missingCapabilities,
    },
    capabilities: capabilityState,
    recentActivity: activity.slice(0, 20).map((entry) => ({
      service: entry.service,
      description: entry.description,
      timestamp: entry.timestamp,
    })),
  };
}

export function buildGoogleHubAgentPrompt(
  request: string,
  context: GoogleHubAgentContext,
): string {
  return [
    request.trim(),
    '',
    'GOOGLE_HUB_CONTEXT (read-only routing context; no credentials):',
    JSON.stringify(context, null, 2),
    '',
    'Use this context to select relevant Google capabilities. Read operations may proceed through the existing Google tools; consequential writes require the normal user-confirmation policy.',
  ].join('\n');
}
