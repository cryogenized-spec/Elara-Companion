const DEFAULT_DISPATCH_LEASE_MS = 15 * 60 * 1000;
const DEFAULT_EXECUTION_LEASE_MS = 30 * 60 * 1000;

export function executionKeyFor(automationId, scheduledFor) {
  return `${automationId}:${scheduledFor}`;
}

export function isTerminalJobStatus(status) {
  return status === 'success' || status === 'succeeded';
}

export function isActiveJobStatus(status) {
  return status === 'dispatching' || status === 'dispatched' || status === 'awaiting_agent_runtime' || status === 'running';
}

export function isFreshLease(job, nowMs, leaseMs = DEFAULT_DISPATCH_LEASE_MS) {
  const timestamp = Date.parse(job?.updatedAt || job?.lastAttemptAt || job?.startedAt || '');
  return Number.isFinite(timestamp) && nowMs - timestamp < leaseMs;
}

export function shouldDispatch(existingJob, nowMs, options = {}) {
  const { leaseMs = DEFAULT_DISPATCH_LEASE_MS, manual = false, due = true } = options;
  if (isTerminalJobStatus(existingJob?.status)) return false;
  if (manual && existingJob?.status === 'dispatched') return false;
  if (!manual && !due) return false;
  if (isActiveJobStatus(existingJob?.status) && isFreshLease(existingJob, nowMs, leaseMs)) return false;
  return true;
}

export function createDispatchClaim({ automationId, scheduledFor, executionKey, nowIso, dispatcherRunId }) {
  return {
    automationId,
    scheduledFor,
    executionKey,
    status: 'dispatching',
    attempts: 0,
    lastAttemptAt: nowIso,
    updatedAt: nowIso,
    claimRunId: dispatcherRunId || null,
  };
}

export function shouldStartExecutor(existingJob, nowMs, options = {}) {
  const { leaseMs = DEFAULT_EXECUTION_LEASE_MS } = options;
  if (isTerminalJobStatus(existingJob?.status)) return false;
  if (existingJob?.status === 'running' && isFreshLease(existingJob, nowMs, leaseMs)) return false;
  return true;
}

export function markExecutionRunning(existingJob, nowIso, workerRunId, workerUrl) {
  return {
    ...existingJob,
    status: 'running',
    workerRunId: workerRunId || null,
    workerUrl: workerUrl || null,
    startedAt: existingJob?.startedAt || nowIso,
    updatedAt: nowIso,
  };
}
