import { createAutomationLockbox } from './automation-lockbox.mjs';
import {
  createDispatchClaim,
  executionKeyFor,
  shouldDispatch,
} from './automation-runtime.mjs';

const GH_API = 'https://api.github.com';
const lockbox = createAutomationLockbox();
const stateRepo = lockbox.requireConfig('ELARA_STATE_REPO');
const token = lockbox.secret('ELARA_STATE_TOKEN');
const ownerRepo = lockbox.requireConfig('GITHUB_REPOSITORY');
const automationIdFilter = lockbox.config('AUTOMATION_ID') || '';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function headers() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function getStateFile(path) {
  const response = await fetch(`${GH_API}/repos/${stateRepo}/contents/${path}?ref=main`, { headers: headers() });
  if (response.status === 404) return { exists: false, sha: null, value: null };
  if (!response.ok) throw new Error(`Failed to read ${path}: HTTP ${response.status}`);
  const body = await response.json();
  return {
    exists: true,
    sha: body.sha,
    value: JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')),
  };
}

async function putStateFile(path, value, sha, message) {
  const payload = {
    message,
    content: Buffer.from(`${JSON.stringify(value, null, 2)}\n`).toString('base64'),
    branch: 'main',
  };
  if (sha) payload.sha = sha;
  const response = await fetch(`${GH_API}/repos/${stateRepo}/contents/${path}`, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (response.status === 409) return { conflict: true };
  if (!response.ok) throw new Error(`Failed to write ${path}: HTTP ${response.status}`);
  return response.json();
}

function advanceNextRun(automation, fromIso) {
  const current = new Date(fromIso);
  if (Number.isNaN(current.getTime())) return null;
  switch (automation.frequency) {
    case 'once':
      return null;
    case 'daily':
      current.setUTCDate(current.getUTCDate() + 1);
      return current.toISOString();
    case 'weekly':
      current.setUTCDate(current.getUTCDate() + 7);
      return current.toISOString();
    case 'monthly':
      current.setUTCMonth(current.getUTCMonth() + 1);
      return current.toISOString();
    default:
      return null;
  }
}

async function dispatchExecutor(automation, executionKey) {
  const response = await fetch(`${GH_API}/repos/${ownerRepo}/actions/workflows/elara-automation-executor.yml/dispatches`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        automation_id: automation.id,
        execution_key: executionKey,
      },
  });
  if (!response.ok) throw new Error(`Executor dispatch failed: HTTP ${response.status}`);
}

async function dispatchWithRetry(automation, executionKey) {
  const maxAttempts = Math.min(3, Math.max(1, Number(automation.retryAttempts || 3)));
  const delayMs = Math.max(5000, Number(automation.retryDelaySeconds || 10) * 1000);
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await dispatchExecutor(automation, executionKey);
      return attempt;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await sleep(delayMs);
    }
  }
  throw lastError;
}

async function updateRuntimeJob(executionKey, updater, message) {
  const latest = await getStateFile('runtime.json');
  const runtime = latest.value && typeof latest.value === 'object'
    ? latest.value
    : { version: 1, jobs: {}, schedules: {} };
  runtime.version = 1;
  runtime.jobs ||= {};
  runtime.schedules ||= {};
  const current = runtime.jobs[executionKey];
  runtime.jobs[executionKey] = updater(current);
  const saved = await putStateFile('runtime.json', runtime, latest.sha, message);
  return { runtime, saved };
}

async function main() {
  const now = new Date();

  const automationsFile = await getStateFile('automations.json');
  const runtimeFile = await getStateFile('runtime.json');

  const automations = Array.isArray(automationsFile.value) ? automationsFile.value : [];
  const runtime = runtimeFile.value && typeof runtimeFile.value === 'object'
    ? runtimeFile.value
    : { version: 1, jobs: {}, schedules: {} };
  runtime.version = 1;
  runtime.jobs ||= {};
  runtime.schedules ||= {};

  const candidates = automations.filter((automation) => {
    if (!automation || automation.enabled !== true) return false;
    if (automationIdFilter && automation.id !== automationIdFilter) return false;
    return true;
  });

  for (const automation of candidates) {
    const configuredNextRunAt = runtime.schedules[automation.id]?.nextRunAt ?? automation.nextRunAt;
    if (!configuredNextRunAt) continue;

    const scheduled = new Date(configuredNextRunAt);
    if (Number.isNaN(scheduled.getTime())) continue;

    const executionKey = executionKeyFor(automation.id, scheduled.toISOString());
    const existing = runtime.jobs[executionKey];
    const manual = Boolean(automationIdFilter);
    const due = scheduled.getTime() <= now.getTime();

    if (!shouldDispatch(existing, now.getTime(), { manual, due })) continue;

    const claim = createDispatchClaim({
      automationId: automation.id,
      scheduledFor: scheduled.toISOString(),
      executionKey,
      nowIso: now.toISOString(),
      dispatcherRunId: lockbox.config('GITHUB_RUN_ID'),
    });

    const claimRuntime = {
      ...runtime,
      jobs: { ...runtime.jobs, [executionKey]: claim },
    };
    const claimWrite = await putStateFile(
      'runtime.json',
      claimRuntime,
      runtimeFile.sha,
      `automation: claim ${executionKey}`,
    );

    if (claimWrite?.conflict) {
      console.log(`Skipped ${executionKey}: another writer claimed or changed runtime state.`);
      continue;
    }

    try {
      const attempts = await dispatchWithRetry(automation, executionKey);
      await updateRuntimeJob(
        executionKey,
        (current) => ({
          ...current,
          status: 'dispatched',
          attempts,
          dispatchedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        `automation: dispatched ${executionKey}`,
      );

      const latest = await getStateFile('runtime.json');
      const latestRuntime = latest.value && typeof latest.value === 'object'
        ? latest.value
        : { version: 1, jobs: {}, schedules: {} };
      latestRuntime.version = 1;
      latestRuntime.jobs ||= {};
      latestRuntime.schedules ||= {};
      latestRuntime.schedules[automation.id] = {
        nextRunAt: advanceNextRun(automation, scheduled.toISOString()),
      };
      await putStateFile('runtime.json', latestRuntime, latest.sha, `automation: advance schedule ${automation.id}`);
      console.log(`Dispatched automation ${automation.id} (${executionKey}) after ${attempts} attempt(s).`);
    } catch (error) {
      const failure = await updateRuntimeJob(
        executionKey,
        (current) => ({
          ...current,
          status: 'dispatch_failed',
          error: String(error?.message || error),
          failedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        `automation: dispatch failed ${executionKey}`,
      );
      if (failure.saved?.conflict) console.error(`Could not persist dispatch failure for ${executionKey}; runtime changed concurrently.`);
      console.error(`Failed to dispatch automation ${automation.id}:`, error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
