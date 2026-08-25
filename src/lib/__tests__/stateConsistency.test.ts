import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  getGoogleAuthorizationState,
  initGoogleBaseAuthorization,
  requestGoogleBaseAuthorization,
  revokeGoogleBaseAuthorization,
} from '../googleAuthorization';
import {
  loadPersistedBackgroundJobs,
  persistBackgroundJob,
  removePersistedBackgroundJob,
} from '../backgroundChatClient';
import {
  clearNextMemoryRetrievalQuery,
  setNextMemoryRetrievalQuery,
  buildSystemPayload,
} from '../contextManager';
import type { MemoryScratchpadState } from '../../types';

const originalLocalStorage = (globalThis as any).localStorage;
const originalWindow = (globalThis as any).window;
const originalDateNow = Date.now;

function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
  };
  return store;
}

function installGoogleStub(): void {
  (globalThis as any).window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (options: { callback: (value: any) => void }) => ({
            callback: options.callback,
            requestAccessToken(this: { callback: (value: any) => void }) {
              this.callback({
                access_token: 'test-token',
                expires_in: 60,
                scope: 'openid email profile',
              });
            },
          }),
        },
      },
    },
  };
}

function emptyMemoryState(): MemoryScratchpadState {
  return { schemaVersion: 3, memories: [], autoMaintenanceEnabled: false };
}

afterEach(() => {
  clearNextMemoryRetrievalQuery();
  (globalThis as any).localStorage = originalLocalStorage;
  (globalThis as any).window = originalWindow;
  Date.now = originalDateNow;
});

describe('state consistency boundaries', () => {
  it('preserves multiple durable background jobs for the same conversation and removes only the completed job', () => {
    installStorage();
    const first = { conversationId: 'conv-1', assistantMessageId: 'msg-1', jobId: 'job-1', createdAt: 1 };
    const second = { conversationId: 'conv-1', assistantMessageId: 'msg-2', jobId: 'job-2', createdAt: 2 };

    persistBackgroundJob(first);
    persistBackgroundJob(second);

    assert.deepEqual(loadPersistedBackgroundJobs().map((job) => job.jobId), ['job-1', 'job-2']);
    removePersistedBackgroundJob('job-1');
    assert.deepEqual(loadPersistedBackgroundJobs().map((job) => job.jobId), ['job-2']);
  });

  it('rejects malformed background recovery records instead of treating them as live jobs', () => {
    const store = installStorage();
    store.set('elara_background_jobs_v1', JSON.stringify([
      { conversationId: 'conv', assistantMessageId: 'msg', createdAt: 1 },
      { conversationId: 'conv', assistantMessageId: 'msg', jobId: '', createdAt: 1 },
      { conversationId: 'conv', assistantMessageId: 'msg', jobId: 'job-valid', createdAt: 1 },
      null,
    ]));

    assert.deepEqual(loadPersistedBackgroundJobs().map((job) => job.jobId), ['job-valid']);
  });

  it('treats Google authorization expiry as a state transition, not a permanently connected flag', async () => {
    installStorage();
    installGoogleStub();
    initGoogleBaseAuthorization();
    await requestGoogleBaseAuthorization(false);

    const connected = getGoogleAuthorizationState();
    assert.equal(connected.authorized, true);
    assert.equal(connected.accessToken, 'test-token');
    assert.ok(connected.expiresAt > Date.now());

    Date.now = () => connected.expiresAt + 1;
    const expired = getGoogleAuthorizationState();
    assert.equal(expired.authorized, false);
    assert.equal(expired.accessToken, '');
    assert.equal(expired.grantedScopes, '');
    assert.equal(expired.expiresAt, 0);

    const revoked = await revokeGoogleBaseAuthorization();
    assert.equal(revoked.success, true);
  });

  it('does not recreate the deprecated memory mirror during normal prompt construction', () => {
    const store = installStorage();
    setNextMemoryRetrievalQuery('coffee');

    const payload = buildSystemPayload({
      baseSystemInstruction: 'Base',
      personaProtocol: 'Persona',
      intimacyModule: 'Intimacy',
      runtimeRules: 'Runtime',
      activeModelId: 'test-model',
      uiSettingsSummary: 'test',
      userProfileNotes: '',
      activeScratchpad: 'LEGACY MIRROR MUST NOT BECOME AUTHORITY',
      memoryState: emptyMemoryState(),
    });

    assert.match(payload, /No contextually relevant memories retrieved/);
    assert.equal(store.size, 0);
  });
});
