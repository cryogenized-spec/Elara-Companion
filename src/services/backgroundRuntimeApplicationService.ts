import type { BackgroundChatJobRequest, BackgroundJobStatus, PersistedBackgroundJob } from '../lib/backgroundChatClient';
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
import { workspaceService } from './workspaceService';
import { reconcileBackgroundWorkspaceResult } from './workspaceBackgroundService';

export type { BackgroundChatJobRequest, BackgroundJobStatus, PersistedBackgroundJob };

async function createChatJob(request: BackgroundChatJobRequest): Promise<{ id: string }> {
  return createBackgroundChatJob({
    ...request,
    workspace: request.workspace || workspaceService.getWorkspace(),
  });
}

async function waitForJob(id: string): Promise<BackgroundJobStatus> {
  const status = await waitForBackgroundChatJob(id);
  if (['complete', 'completed'].includes(status.status)) {
    reconcileBackgroundWorkspaceResult(status);
  }
  return status;
}

export const backgroundRuntimeApplicationService = {
  getConfig: getBackgroundRuntimeConfig,
  isConfigured: isBackgroundRuntimeConfigured,
  isEnabled: isBackgroundRuntimeEnabled,
  saveConfig: saveBackgroundRuntimeConfig,
  setEnabled: setBackgroundRuntimeEnabled,
  loadPersistedJobs: loadPersistedBackgroundJobs,
  persistJob: persistBackgroundJob,
  removeJob: removePersistedBackgroundJob,
  createChatJob,
  getJob: getBackgroundChatJob,
  waitForJob,
};

export type BackgroundRuntimeApplicationService = typeof backgroundRuntimeApplicationService;
