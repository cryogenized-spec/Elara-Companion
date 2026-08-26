import type {
  BackgroundChatJobRequest,
  BackgroundJobStatus,
  PersistedBackgroundJob,
} from '../lib/backgroundChatClient';
import {
  createBackgroundChatJob,
  getBackgroundChatJob,
  getBackgroundRuntimeConfig,
  isBackgroundRuntimeConfigured,
  isBackgroundRuntimeEnabled,
  loadPersistedBackgroundJobs,
  persistBackgroundJob,
  removePersistedBackgroundJob,
  saveBackgroundRuntimeConfig,
  setBackgroundRuntimeEnabled,
  waitForBackgroundChatJob,
} from '../lib/backgroundChatClient';
import { getWorkspace } from '../lib/workspaceStorage';
import { reconcileBackgroundWorkspaceResult } from './workspaceBackgroundService';

export type { BackgroundChatJobRequest, BackgroundJobStatus, PersistedBackgroundJob };

const reconciledJobIds = new Set<string>();

function reconcileTerminalJob(status: BackgroundJobStatus): BackgroundJobStatus {
  if (!['complete', 'completed'].includes(status.status)) return status;
  if (reconciledJobIds.has(status.id)) return status;

  reconcileBackgroundWorkspaceResult(status);
  reconciledJobIds.add(status.id);
  return status;
}

async function createChatJob(request: BackgroundChatJobRequest): Promise<{ id: string }> {
  return createBackgroundChatJob({
    ...request,
    workspace: request.workspace || getWorkspace(),
  });
}

async function getJob(id: string): Promise<BackgroundJobStatus> {
  return reconcileTerminalJob(await getBackgroundChatJob(id));
}

async function waitForJob(
  id: string,
  onStatus?: (status: BackgroundJobStatus) => void,
  intervalMs = 1500,
  timeoutMs = 30 * 60 * 1000,
): Promise<BackgroundJobStatus> {
  const status = await waitForBackgroundChatJob(id, onStatus, intervalMs, timeoutMs);
  return reconcileTerminalJob(status);
}

export const backgroundApplicationService = {
  getConfig: getBackgroundRuntimeConfig,
  isConfigured: isBackgroundRuntimeConfigured,
  isEnabled: isBackgroundRuntimeEnabled,
  saveConfig: saveBackgroundRuntimeConfig,
  setEnabled: setBackgroundRuntimeEnabled,
  loadPersistedJobs: loadPersistedBackgroundJobs,
  persistJob: persistBackgroundJob,
  removeJob: removePersistedBackgroundJob,
  createChatJob,
  getJob,
  waitForJob,
};

export type BackgroundApplicationService = typeof backgroundApplicationService;
