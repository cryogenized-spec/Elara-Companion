const GH_API = 'https://api.github.com';
const stateRepo = process.env.ELARA_STATE_REPO;
const token = process.env.ELARA_STATE_TOKEN;
const automationId = process.env.AUTOMATION_ID;
const executionKey = process.env.EXECUTION_KEY;

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
  return { exists: true, sha: body.sha, value: JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')) };
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
}

async function main() {
  if (!stateRepo || !token || !automationId || !executionKey) {
    console.log('Automation executor is not configured or was invoked without a job.');
    return;
  }

  const automationsFile = await getStateFile('automations.json');
  const runtimeFile = await getStateFile('runtime.json');
  const automations = Array.isArray(automationsFile.value) ? automationsFile.value : [];
  const automation = automations.find((item) => item?.id === automationId);
  if (!automation) throw new Error(`Automation ${automationId} was not found in private state.`);

  const runtime = runtimeFile.value && typeof runtimeFile.value === 'object'
    ? runtimeFile.value
    : { version: 1, jobs: {}, schedules: {} };
  runtime.version = 1;
  runtime.jobs ||= {};
  runtime.schedules ||= {};

  const job = runtime.jobs[executionKey] || {
    automationId,
    scheduledFor: automation.nextRunAt || new Date().toISOString(),
    attempts: 0,
  };

  runtime.jobs[executionKey] = {
    ...job,
    status: 'awaiting_agent_runtime',
    workerRunId: process.env.GITHUB_RUN_ID || null,
    workerUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
    updatedAt: new Date().toISOString(),
  };

  await putStateFile('runtime.json', runtime, runtimeFile.sha, `automation: accepted ${executionKey}`);
  console.log(`Automation ${automationId} accepted by the GitHub worker.`);
  console.log('Agent execution is intentionally deferred to Pass 3.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
