import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGoogleHubAgentContext, buildGoogleHubAgentPrompt } from './googleHubContextService';
import type { GoogleHubAuthorizationSnapshot, GoogleHubCapabilityDescriptor } from '../contracts/googleHub';

const descriptors: GoogleHubCapabilityDescriptor[] = [{
  id: 'gmail', name: 'Gmail', description: 'Mail', category: 'communication', iconKey: 'mail', requiredCapabilities: ['gmail.read'],
  actionRequirements: { search: ['gmail.read'], send: ['gmail.send'], open: [], ask: [] },
  panelKey: 'google.gmail', actions: [
    { id: 'search', label: 'Search mail', kind: 'search' }, { id: 'send', label: 'Send mail', kind: 'create' }, { id: 'open', label: 'Open Gmail', kind: 'open' }, { id: 'ask', label: 'Ask Elara', kind: 'ask' },
  ],
}];

const snapshot: GoogleHubAuthorizationSnapshot = {
  status: 'partially-authorized', authorized: true, grantedCapabilities: ['gmail.read'], missingCapabilities: ['gmail.send'], updatedAt: 123,
};

test('Google Hub context exposes action-level availability without credentials', () => {
  const context = buildGoogleHubAgentContext(descriptors, snapshot, 'user@example.com', [{ service: 'gmail', description: 'Read 2 Gmail messages', timestamp: 456 }]);
  assert.equal(context.accountEmail, 'user@example.com');
  assert.equal(context.capabilities[0].status, 'limited');
  assert.deepEqual(context.capabilities[0].enabledActions, ['Search mail', 'Open Gmail', 'Ask Elara']);
  assert.deepEqual(context.capabilities[0].blockedActions, ['Send mail']);
  assert.equal(JSON.stringify(context).includes('access_token'), false);
});

test('Google Hub prompt embeds structured context and preserves credential-free boundary', () => {
  const context = buildGoogleHubAgentContext(descriptors, snapshot);
  const prompt = buildGoogleHubAgentPrompt('Check mail.', context);
  assert.match(prompt, /GOOGLE_HUB_CONTEXT/);
  assert.match(prompt, /gmail/);
  assert.doesNotMatch(prompt, /access_token/i);
});
