import type { Workspace } from '../types';
import { getWorkspace, saveWorkspace } from './workspaceStorage';

export interface BackgroundRuntimeConfig {
  baseUrl: string;
  token: string;
}

export interface BackgroundChatJobRequest {
  message: string;
  image?: string;
  history?: Array<{ role: 'user' | 'assistant'; content?: string; image?: string }>;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  workspace?: Workspace;
}

export interface BackgroundJobStatus {
  id: string;
  status: string;
  output?: {
    status?: string;
    completedAt?: string;
    result?: {
      text?: string;
      model?: string;
      finishReason?: string | null;
      responseId?: string | null;
      workspace?: Workspace;
      createdArtifactIds?: string[];
      modifiedArtifactIds?: string[];
      toolRounds?: number;
    };
  };
  error?: unknown;
}

export interface PersistedBackgroundJob {
  conversationId: string;
  assistantMessageId: string;
  jobId: string;
  createdAt: number;
}

const URL_KEY = 'elara_background_runtime_url_v1';
const TOKEN_KEY = 'elara_background_runtime_token_v1';
const ENABLED_KEY = 'elara_background_runtime_enabled_v1';
const JOBS_KEY = 'elara_background_jobs_v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function getBackgroundRuntimeConfig(): BackgroundRuntimeConfig | null {
  try {
    const baseUrl = localStorage.getItem(URL_KEY)?.trim() || '';
    const token = localStorage.getItem(TOKEN_KEY)?.trim() || '';
    return baseUrl && token ? { baseUrl: baseUrl.replace(/\/+$/, ''), token } : null;
  } catch {
    return null;
  }
}

export function saveBackgroundRuntimeConfig(config: BackgroundRuntimeConfig | null): void {
  try {
    if (!config) {
      localStorage.removeItem(URL_KEY);
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    localStorage.setItem(URL_KEY, config.baseUrl.trim().replace(/\/+$/, ''));
    localStorage.setItem(TOKEN_KEY, config.token.trim());
  } catch {
    // Best effort only.
  }
}

export function isBackgroundRuntimeConfigured(): boolean {
  return Boolean(getBackgroundRuntimeConfig());
}

export function isBackgroundRuntimeEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === 'true' && isBackgroundRuntimeConfigured();
  } catch {
    return false;
  }
}

export function setBackgroundRuntimeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, String(enabled));
  } catch {
    // Best effort only.
  }
}

export function loadPersistedBackgroundJobs(): PersistedBackgroundJob[] {
  const jobs = readJson<unknown>(JOBS_KEY, []);
  if (!Array.isArray(jobs)) return [];
  return jobs.filter((item): item is PersistedBackgroundJob => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Record<string, unknown>;
    return typeof candidate.jobId === 'string'
      && candidate.jobId.trim().length > 0
      && typeof candidate.conversationId === 'string'
      && typeof candidate.assistantMessageId === 'string'
      && typeof candidate.createdAt === 'number';
  });
}

export function persistBackgroundJob(record: PersistedBackgroundJob): void {
  try {
    const current = loadPersistedBackgroundJobs().filter((item) => item.jobId !== record.jobId);
    current.push(record);
    localStorage.setItem(JOBS_KEY, JSON.stringify(current));
  } catch {
    // Best effort only.
  }
}

export function removePersistedBackgroundJob(jobId: string): void {
  try {
    const next = loadPersistedBackgroundJobs().filter((item) => item.jobId !== jobId);
    localStorage.setItem(JOBS_KEY, JSON.stringify(next));
  } catch {
    // Best effort only.
  }
}

async function runtimeFetch(path: string, init: RequestInit = {}) {
  const config = getBackgroundRuntimeConfig();
  if (!config) throw new Error('Elara background runtime is not configured.');

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${config.token}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${config.baseUrl}${path}`, { ...init, headers });
  const raw = await response.text();
  let data: any = null;
  try { data = JSON.parse(raw); } catch { data = { error: raw }; }
  if (!response.ok) throw new Error(data?.error || `Background runtime returned HTTP ${response.status}.`);
  return data;
}

export async function createBackgroundChatJob(request: BackgroundChatJobRequest): Promise<{ id: string }> {
  const payload = { ...request, workspace: request.workspace || getWorkspace() };
  const data = await runtimeFetch('/jobs', { method: 'POST', body: JSON.stringify(payload) });
  return { id: data.id };
}

function reconcileBackgroundResult(status: BackgroundJobStatus) {
  const result = status.output?.result;
  if (!result?.workspace) return;
  saveWorkspace(result.workspace);
  for (const artifactId of result.createdArtifactIds || []) {
    const artifact = result.workspace.artifacts.find((item) => item.id === artifactId);
    if (artifact) {
      window.dispatchEvent(new CustomEvent('elara:artifact-created', { detail: { artifact, action: 'created' } }));
    }
  }
}

export async function getBackgroundChatJob(id: string): Promise<BackgroundJobStatus> {
  const status = await runtimeFetch(`/jobs/${encodeURIComponent(id)}`, { method: 'GET' }) as BackgroundJobStatus;
  if (['complete', 'completed'].includes(status.status)) reconcileBackgroundResult(status);
  return status;
}

export async function waitForBackgroundChatJob(
  id: string,
  onStatus?: (status: BackgroundJobStatus) => void,
  intervalMs = 1500,
  timeoutMs = 30 * 60 * 1000,
): Promise<BackgroundJobStatus> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await getBackgroundChatJob(id);
    onStatus?.(status);
    if (['complete', 'completed', 'errored', 'failed', 'terminated'].includes(status.status)) return status;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Timed out while waiting for Elara background job status.');
}
