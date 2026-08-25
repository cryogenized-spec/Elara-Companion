import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createChatCapabilityBundle } from '../implementations';

function functionKeys(value: object): string[] {
  return Object.entries(value)
    .filter(([, member]) => typeof member === 'function')
    .map(([key]) => key)
    .sort();
}

describe('feature contracts', () => {
  it('exposes the complete Chat capability bundle', () => {
    const bundle = createChatCapabilityBundle();

    assert.deepEqual(functionKeys(bundle.memory), ['getLoaded', 'load', 'reduce', 'save']);
    assert.deepEqual(functionKeys(bundle.workspace), [
      'createArtifact',
      'deleteArtifact',
      'getArtifactById',
      'getWorkspace',
      'saveAgentArtifact',
      'saveWorkspace',
      'setActiveArtifact',
      'updateArtifact',
    ]);
    assert.deepEqual(functionKeys(bundle.google), [
      'getAccessToken',
      'getClientId',
      'getGrantedScopes',
      'isAuthorized',
      'isCapabilityGranted',
      'requestCapabilityAuthorization',
      'revoke',
    ]);
    assert.deepEqual(functionKeys(bundle.background), [
      'createChatJob',
      'getJob',
      'isConfigured',
      'isEnabled',
      'loadPersistedJobs',
      'persistJob',
      'removeJob',
      'waitForJob',
    ]);
    assert.deepEqual(functionKeys(bundle.runtime), ['normalizeWorkspace', 'stream']);
  });
});
