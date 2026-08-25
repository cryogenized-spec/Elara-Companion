import { createAutomationLockbox } from './automation-lockbox.mjs';
import {
  markExecutionRunning,
  shouldStartExecutor,
} from './automation-runtime.mjs';

const GH_API = 'https://api.github.com';
const lockbox = createAutomationLockbox();
const stateRepo = lockbox.requireConfig('ELARA_STATE_REPO');
const token = lockbox.secret('ELARA_STATE_TOKEN');
const automationId = lockbox.requireConfig('AUTOMATION_ID');
const executionKey = lockbox.requireConfig('EXECUTION_KEY');

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
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to write ${path}: HTTP ${response.status}${text ? ` ${text}` : ''}`);
  }
  return response.json();
}

function truncate(value, max = 12000) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return text.length > max ? `${text.slice(0, max)}\n…[truncated]` : text;
}

async function executeElaraAutomation(prompt, workspace, googleToken) {
  const { getGeminiClient, normalizeModelName } = await import('../server/services/gemini.ts');
  const {
    buildConversationContents,
    buildRuntimeConfig,
    executeAgentToolCall,
    mergeTouchedArtifactIds,
    MAX_AGENT_ITERATIONS,
  } = await import('../src/lib/chatRuntime.ts');

  const model = normalizeModelName(lockbox.config('GEMINI_MODEL') || 'gemini-3.6-flash');
  const ai = getGeminiClient();
  const systemPrompt = [
    '[SCHEDULED AUTOMATION CONTEXT]',
    'You are Elara executing a scheduled automation.',
    'There is no interactive user present. Follow the automation prompt faithfully.',
    'You may use read-only Google tools and local Workspace tools when appropriate.',
    'Do not attempt Google writes, deletes, sends, or authentication changes unless the automation explicitly provides an authorized confirmation context.',
    'Keep the final result concise, useful, and directly tied to the automation objective.',
  ].join('\n');

  const contents = buildConversationContents([], prompt);
  const config = buildRuntimeConfig({
    model,
    systemPrompt,
    workspace,
    googleToken,
    toolExposure: {
      source: 'automation',
      availableCapabilities: [
        'workspace.read',
        'workspace.write',
        ...(googleToken ? ['google.read'] : []),
      ],
      disallowedEffects: ['external-write', 'auth-change'],
    },
    includeSafetySettings: true,
  });

  let currentWorkspace = workspace;
  let touchedArtifactIds = [];
  let finalText = '';
  let iteration = 0;

  while (iteration < MAX_AGENT_ITERATIONS) {
    iteration += 1;
    const response = await ai.models.generateContent({ model, contents, config });
    const responseParts = response.candidates?.[0]?.content?.parts || [];
    const functionCalls = responseParts
      .map((part) => part?.functionCall)
      .filter(Boolean);
    const textParts = responseParts
      .map((part) => part?.text)
      .filter((value) => typeof value === 'string');

    if (textParts.length) finalText += `${textParts.join('')}\n`;
    if (!functionCalls.length) break;

    contents.push({ role: 'model', parts: responseParts });
    const toolResponseParts = [];

    for (const fc of functionCalls) {
      const execution = await executeAgentToolCall(currentWorkspace, fc.name, fc.args, googleToken, 'automation');
      currentWorkspace = execution.updatedWorkspace;
      touchedArtifactIds = mergeTouchedArtifactIds(touchedArtifactIds, execution);
      toolResponseParts.push({
        functionResponse: {
          name: fc.name,
          response: execution.result,
          id: fc.id,
        },
      });
    }

    contents.push({ role: 'tool', parts: toolResponseParts });
  }

  return {
    model,
    text: finalText.trim(),
    workspace: currentWorkspace,
    touchedArtifactIds,
    iterations: iteration,
  };
}

async function markRunningWithCas(existingRuntime) {
  const runtime = existingRuntime.value && typeof existingRuntime.value === 'object'
    ? existingRuntime.value
    : { version: 1, jobs: {}, schedules: {} };
  runtime.version = 1;
  runtime.jobs ||= {};
  runtime.schedules ||= {};

  const existingJob = runtime.jobs[executionKey] || {
    automationId,
    scheduledFor: new Date().toISOString(),
    attempts: 0,
  };

  if (!shouldStartExecutor(existingJob, Date.now())) return { skip: true, runtime, job: existingJob };

  const now = new Date().toISOString();
  runtime.jobs[executionKey] = markExecutionRunning(
    existingJob,
    now,
    lockbox.config('GITHUB_RUN_ID'),
    lockbox.config('GITHUB_SERVER_URL') && lockbox.config('GITHUB_REPOSITORY')
      ? `${lockbox.config('GITHUB_SERVER_URL')}/${lockbox.config('GITHUB_REPOSITORY')}/actions/runs/${lockbox.config('GITHUB_RUN_ID')}`
      : null,
  );

  const saved = await putStateFile('runtime.json', runtime, existingRuntime.sha, `automation: running ${executionKey}`);
  if (saved?.conflict) return { conflict: true };
  return { runtime, job: runtime.jobs[executionKey], skip: false };
}

async function main() {
  const automationsFile = await getStateFile('automations.json');
  const automation = (Array.isArray(automationsFile.value) ? automationsFile.value : [])
    .find((item) => item?.id === automationId);
  if (!automation) throw new Error(`Automation ${automationId} was not found in private state.`);

  const runtimeFile = await getStateFile('runtime.json');
  const running = await markRunningWithCas(runtimeFile);
  if (running?.skip) {
    console.log(`Skipping ${executionKey}: execution is already terminal or actively running.`);
    return;
  }
  if (running?.conflict) {
    const latest = await getStateFile('runtime.json');
    const retry = await markRunningWithCas(latest);
    if (retry?.skip) {
      console.log(`Skipping ${executionKey}: execution was claimed by another worker.`);
      return;
    }
    if (retry?.conflict) throw new Error(`Could not claim execution ${executionKey} after state conflict.`);
  }

  const workspace = {
    id: `automation-${automationId}`,
    name: automation.name || 'Automation Workspace',
    artifacts: [],
    activeArtifactId: null,
  };

  try {
    const result = await executeElaraAutomation(
      String(automation.prompt || ''),
      workspace,
      lockbox.optionalSecret('ELARA_GOOGLE_TOKEN'),
    );
    const refreshedRuntime = await getStateFile('runtime.json');
    const refreshed = refreshedRuntime.value && typeof refreshedRuntime.value === 'object'
      ? refreshedRuntime.value
      : { version: 1, jobs: {}, schedules: {} };
    refreshed.version = 1;
    refreshed.jobs ||= {};
    refreshed.schedules ||= {};
    refreshed.jobs[executionKey] = {
      ...refreshed.jobs[executionKey],
      status: 'success',
      completedAt: new Date().toISOString(),
      result: truncate(result.text),
      model: result.model,
      iterations: result.iterations,
      touchedArtifactIds: result.touchedArtifactIds,
      updatedAt: new Date().toISOString(),
    };
    const saved = await putStateFile('runtime.json', refreshed, refreshedRuntime.sha, `automation: completed ${executionKey}`);
    if (saved?.conflict) console.warn(`Runtime changed while recording success for ${executionKey}; completion will be reconciled by the next runtime pass.`);
    console.log(`Automation ${automationId} completed successfully.`);
    console.log(truncate(result.text, 2000));
  } catch (error) {
    const refreshedRuntime = await getStateFile('runtime.json');
    const refreshed = refreshedRuntime.value && typeof refreshedRuntime.value === 'object'
      ? refreshedRuntime.value
      : { version: 1, jobs: {}, schedules: {} };
    refreshed.version = 1;
    refreshed.jobs ||= {};
    refreshed.schedules ||= {};
    refreshed.jobs[executionKey] = {
      ...refreshed.jobs[executionKey],
      status: 'failed',
      completedAt: new Date().toISOString(),
      error: String(error?.message || error),
      updatedAt: new Date().toISOString(),
    };
    await putStateFile('runtime.json', refreshed, refreshedRuntime.sha, `automation: failed ${executionKey}`);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});