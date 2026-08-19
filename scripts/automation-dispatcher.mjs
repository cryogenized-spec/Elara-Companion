const GH_API = 'https://api.github.com';
const stateRepo = process.env.ELARA_STATE_REPO;
const token = process.env.ELARA_STATE_TOKEN;
const ownerRepo = process.env.GITHUB_REPOSITORY;
const automationIdFilter = process.env.AUTOMATION_ID || '';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function requireConfig() {
  if (!stateRepo || !token || !ownerRepo) {
    console.log('Elara automation worker is not configured yet. Set ELARA_STATE_REPO and ELARA_STATE_TOKEN.');
    process.exit(0);
  }
}

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
    }),
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

async function main() {
  requireConfig();
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

  let changed = false;

  for (const automation of candidates) {
    const configuredNextRunAt = runtime.schedules[automation.id]?.nextRunAt ?? automation.nextRunAt;
    if (!configuredNextRunAt) continue;

    const scheduled = new Date(configuredNextRunAt);
    if (Number.isNaN(scheduled.getTime())) continue;

    const executionKey = `${automation.id}:${scheduled.toISOString()}`;
    const existing = runtime.jobs[executionKey];

    const manual = Boolean(automationIdFilter);
    const due = scheduled.getTime() <= now.getTime();
    const alreadyAccepted = existing?.status === 'dispatched' || existing?.status === 'awaiting_agent_runtime' || existing?.status === 'succeeded';

    if (!manual && (!due || alreadyAccepted)) continue;
    if (manual && alreadyAccepted) continue;

    const attemptStartedAt = now.toISOString();
    runtime.jobs[executionKey] = {
      automationId: automation.id,
      scheduledFor: scheduled.toISOString(),
      status: 'dispatching',
      attempts: 0,
      lastAttemptAt: attemptStartedAt,
    };
    changed = true;

    try {
      const attempts = await dispatchWithRetry(automation, executionKey);
      runtime.jobs[executionKey] = {
        ...runtime.jobs[executionKey],
        status: 'dispatched',
        attempts,
        dispatchedAt: new Date().toISOString(),
      };
      runtime.schedules[automation.id] = {
        nextRunAt: manual ? advanceNextRun(automation, scheduled.toISOString()) : advanceNextRun(automation, scheduled.toISOString()),
      };
      changed = true;
      console.log(`Dispatched automation ${automation.id} (${executionKey}) after ${attempts} attempt(s).`);
    } catch (error) {
      runtime.jobs[executionKey] = {
        ...runtime.jobs[executionKey],
        status: 'dispatch_failed',
        error: String(error?.message || error),
        failedAt: new Date().toISOString(),
      };
      changed = true;
      console.error(`Failed to dispatch automation ${automation.id}:`, error);
    }
  }

  if (changed) {
    await putStateFile('runtime.json', runtime, runtimeFile.sha, `automation: dispatcher state ${now.toISOString()}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
