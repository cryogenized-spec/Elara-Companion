import type { GoogleCapability } from '../contracts';
import type { GoogleHubAuthorizationSnapshot, GoogleHubCapabilityDescriptor } from '../contracts/googleHub';
import { projectGoogleHubCapabilityStates, type GoogleHubCapabilityState } from './googleHubCapabilityState';

export interface GoogleHubSelectedResource {
  capabilityId: string;
  resourceType: string;
  resourceId: string;
  name?: string;
  providerUrl?: string;
  mimeType?: string;
  excerpt?: string;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

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
    status: GoogleHubCapabilityState['status'];
    missingBaseCapabilities: readonly GoogleCapability[];
    actions: readonly {
      id: string;
      label: string;
      kind: string;
      available: boolean;
      requiredCapabilities: readonly GoogleCapability[];
      requiresConfirmation: boolean;
      destructive: boolean;
    }[];
  }[];
  selectedResource?: GoogleHubSelectedResource;
  recentActivity: readonly {
    service: string;
    description: string;
    timestamp: number;
  }[];
}

export interface GoogleHubAskRequest {
  request: string;
  selectedResource?: GoogleHubSelectedResource;
}

export function buildGoogleHubAgentContext(
  capabilities: readonly GoogleHubCapabilityDescriptor[],
  authorization: GoogleHubAuthorizationSnapshot,
  accountEmail?: string,
  activity: readonly { service: string; description: string; timestamp: number }[] = [],
  selectedResource?: GoogleHubSelectedResource,
): GoogleHubAgentContext {
  const states = projectGoogleHubCapabilityStates(
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
    capabilities: states.map((state, index) => ({
      id: state.id,
      name: capabilities[index]?.name ?? state.id,
      category: capabilities[index]?.category ?? 'collaboration',
      status: state.status,
      missingBaseCapabilities: state.missingBaseCapabilities,
      actions: state.actions.map((action) => ({
        id: action.id,
        label: action.label,
        kind: action.kind,
        available: action.available,
        requiredCapabilities: action.requiredCapabilities,
        requiresConfirmation: action.requiresConfirmation,
        destructive: action.destructive,
      })),
    })),
    selectedResource: selectedResource
      ? {
          ...selectedResource,
          excerpt: selectedResource.excerpt?.slice(0, 12000),
        }
      : undefined,
    recentActivity: activity.slice(0, 20).map((entry) => ({
      service: entry.service,
      description: entry.description,
      timestamp: entry.timestamp,
    })),
  };
}

export function buildGoogleHubAgentPrompt(
  request: string | GoogleHubAskRequest,
  context: GoogleHubAgentContext,
): string {
  const text = typeof request === 'string' ? request.trim() : request.request.trim();
  return [
    text,
    '',
    'GOOGLE_HUB_CONTEXT (read-only routing context; no credentials):',
    JSON.stringify(context, null, 2),
    '',
    'Use this structured context to select relevant Google capabilities. Read operations may proceed through the existing Google tools; consequential writes require the normal user-confirmation policy. Never infer permission from missing context, and never expose credentials.',
  ].join('\n');
}
