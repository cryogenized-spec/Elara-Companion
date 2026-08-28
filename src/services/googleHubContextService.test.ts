import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGoogleHubAgentContext, buildGoogleHubAgentPrompt } from './googleHubContextService';
import type { GoogleHubAuthorizationSnapshot, GoogleHubCapabilityDescriptor } from '../contracts/googleHub';

const descriptors: GoogleHubCapabilityDescriptor[] = [{
  id: 'gmail', name: 'Gmail', description: 'Mail', category: 'communication', iconKey: 'mail', requiredCapabilities: ['gmail.read'],
  actionRequirements: { search: ['gmail.read'], compose: ['gmail.compose'], send: ['gmail.send'], open: [], ask: [] },
  panelKey: 'google.gmail', actions: [
    { id: 'search', label: 'Search mail', kind: 'search' }, { id: 'compose', label: 'Create draft', kind: 'create' }, { id: 'send', label: 'Send mail', kind: 'create', requiresConfirmation: true }, { id: 'open', label: 'Open Gmail', kind: 'open' }, { id: 'ask', label: 'Ask Elara', kind: 'ask' },
  ],
}];

const partialSnapshot: GoogleHubAuthorizationSnapshot = {
  status: 'partially-authorized', authorized: true, grantedCapabilities: ['gmail.read'], missingCapabilities: ['gmail.compose', 'gmail.send'], updatedAt: 123,
};

test('Google Hub context exposes action-level availability without credentials', () => {
  const context = buildGoogleHubAgentContext(
    descriptors,
    partialSnapshot,
    'user@example.com',
    [{ service: 'gmail', description: 'Read 2 Gmail messages', timestamp: 456 }],
    { capabilityId: 'gmail', resourceType: 'message', resourceId: 'msg-123', name: 'Supplier invoice', providerUrl: 'https://mail.google.com/', excerpt: 'Invoice context' },
  );
  assert.equal(context.accountEmail, 'user@example.com');
  assert.equal(context.capabilities[0].status, 'limited');
  assert.deepEqual(context.capabilities[0].actions.filter(action => action.available).map(action => action.label), ['Search mail', 'Open Gmail', 'Ask Elara']);
  assert.deepEqual(context.capabilities[0].actions.filter(action => !action.available).map(action => action.label), ['Create draft', 'Send mail']);
  assert.deepEqual(context.capabilities[0].actions.find(action => action.id === 'send')?.requiredCapabilities, ['gmail.send']);
  assert.equal(context.capabilities[0].actions.find(action => action.id === 'send')?.requiresConfirmation, true);
  assert.equal(context.selectedResource?.resourceId, 'msg-123');
  assert.equal(context.selectedResource?.excerpt, 'Invoice context');
  assert.equal(JSON.stringify(context).includes('access_token'), false);
});

test('Google Hub context reports unavailable when the Google identity is unauthorized', () => {
  const snapshot: GoogleHubAuthorizationSnapshot = {
    status: 'unauthorized', authorized: false, grantedCapabilities: [], missingCapabilities: ['gmail.read', 'gmail.compose', 'gmail.send'], updatedAt: 456,
  };
  const context = buildGoogleHubAgentContext(descriptors, snapshot);
  assert.equal(context.capabilities[0].status, 'unavailable');
  assert.deepEqual(context.capabilities[0].actions.filter(action => action.available).map(action => action.label), ['Open Gmail', 'Ask Elara']);
  assert.deepEqual(context.capabilities[0].actions.filter(action => !action.available).map(action => action.label), ['Search mail', 'Create draft', 'Send mail']);
});

test('Google Hub context reports fully enabled when all actionable requirements are granted', () => {
  const snapshot: GoogleHubAuthorizationSnapshot = {
    status: 'authorized', authorized: true, grantedCapabilities: ['gmail.read', 'gmail.compose', 'gmail.send'], missingCapabilities: [], updatedAt: 789,
  };
  const context = buildGoogleHubAgentContext(descriptors, snapshot);
  assert.equal(context.capabilities[0].status, 'enabled');
  assert.deepEqual(context.capabilities[0].actions.filter(action => !action.available), []);
  assert.deepEqual(context.capabilities[0].actions.map(action => action.label), ['Search mail', 'Create draft', 'Send mail', 'Open Gmail', 'Ask Elara']);
});

test('Google Hub prompt embeds structured context, selected resource context, and preserves credential-free boundary', () => {
  const resource = { capabilityId: 'gmail', resourceType: 'message', resourceId: 'msg-123', name: 'Supplier invoice', excerpt: 'Invoice context' } as const;
  const context = buildGoogleHubAgentContext(descriptors, partialSnapshot, undefined, [], resource);
  const prompt = buildGoogleHubAgentPrompt({ request: 'Check this mail.', selectedResource: resource }, context);
  assert.match(prompt, /GOOGLE_HUB_CONTEXT/);
  assert.match(prompt, /Supplier invoice/);
  assert.match(prompt, /msg-123/);
  assert.match(prompt, /requiresConfirmation/);
  assert.doesNotMatch(prompt, /access_token/i);
});

test('Google Hub context bounds resource excerpts and activity', () => {
  const longExcerpt = 'x'.repeat(20000);
  const activity = Array.from({ length: 40 }, (_, index) => ({ service: 'gmail', description: `event ${index}`, timestamp: index }));
  const context = buildGoogleHubAgentContext(descriptors, partialSnapshot, undefined, activity, {
    capabilityId: 'gmail', resourceType: 'message', resourceId: 'msg-123', excerpt: longExcerpt,
  });
  assert.equal(context.recentActivity.length, 20);
  assert.equal(context.selectedResource?.excerpt?.length, 12000);
});
