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

export type { BackgroundChatJobRequest, BackgroundJobStatus, PersistedBackgroundJob };

export const backgroundRuntimeService = {
  getConfig: getBackgroundRuntimeConfig,
  isConfigured: isBackgroundRuntimeConfigured,
  isEnabled: isBackgroundRuntimeEnabled,
  saveConfig: saveBackgroundRuntimeConfig,
  setEnabled: setBackgroundRuntimeEnabled,
  loadPersistedJobs: loadPersistedBackgroundJobs,
  persistJob: persistBackgroundJob,
  removeJob: removePersistedBackgroundJob,
  createChatJob: createBackgroundChatJob,
  getJob: getBackgroundChatJob,
  waitForJob: waitForBackgroundChatJob,
};

export type BackgroundRuntimeService = typeof backgroundRuntimeService;
