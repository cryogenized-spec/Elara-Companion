import type { GoogleCapability } from '../contracts';
import type { GoogleHubAuthorizationSnapshot, GoogleHubCapabilityDescriptor } from '../contracts/googleHub';
import { projectGoogleHubCapabilityStates } from './googleHubCapabilityState';

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
    status: 'enabled' | 'limited' | 'needs-access' | 'unavailable' | 'error';
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
  const capabilityState = projectGoogleHubCapabilityStates(
    capabilities,
    authorization.grantedCapabilities,
    authorization.authorized,
  );

  return {
    provider: 'google',
    accountEmail,
    authorization: {
      status: authorization.status,
      authorized: authorization.authorized,
      grantedCapabilities: authorization.grantedCapabilities,
      missingCapabilities: authorization.missingCapabilities,
    },
    capabilities: capabilityState.map((state, index) => ({
      id: state.id,
      name: capabilities[index].name,
      category: capabilities[index].category,
      status: state.status,
      enabledActions: state.enabledActions,
      blockedActions: state.blockedActions,
    })),
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
