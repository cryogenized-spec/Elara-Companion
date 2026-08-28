import type { ResilienceDiagnosticEvent } from './resilienceDiagnostics';
import { getResilienceDiagnosticHistory } from './resilienceDiagnostics';

export type ResilienceModelHealth = 'healthy' | 'degraded' | 'cooling down' | 'unavailable';

export interface ResilienceModelHealthSnapshot {
  model: string;
  health: ResilienceModelHealth;
  lastEventAt?: number;
  lastErrorCode?: ResilienceDiagnosticEvent['errorCode'];
  cooldownUntil?: number;
  failures: number;
  successes: number;
}

function deriveModel(events: ResilienceDiagnosticEvent[], model: string, now: number): ResilienceModelHealthSnapshot {
  const relevant = events.filter((event) => event.actualModel === model);
  const failures = relevant.filter((event) => event.kind === 'ERROR' || event.kind === 'COOLDOWN').length;
  const successes = relevant.filter((event) => event.kind === 'SUCCESS' || event.kind === 'RECOVERY').length;
  const latest = [...relevant].sort((a, b) => b.timestamp - a.timestamp)[0];
  const latestError = [...relevant].find((event) => event.kind === 'ERROR' || event.kind === 'COOLDOWN');
  const latestCooldown = [...relevant].find((event) => event.cooldownUntil && event.cooldownUntil > now);

  let health: ResilienceModelHealth = 'healthy';
  if (latest?.errorCode === 'MODEL_NOT_FOUND_404' && (latest.kind === 'ERROR' || latest.kind === 'COOLDOWN')) {
    health = 'unavailable';
  } else if (latestCooldown) {
    health = 'cooling down';
  } else if (failures > 0 && (!latest || latest.kind !== 'SUCCESS' && latest.kind !== 'RECOVERY')) {
    health = 'degraded';
  }

  return {
    model,
    health,
    lastEventAt: latest?.timestamp,
    lastErrorCode: latestError?.errorCode,
    cooldownUntil: latestCooldown?.cooldownUntil,
    failures,
    successes,
  };
}

export function deriveModelHealthHistory(
  events: ResilienceDiagnosticEvent[] = getResilienceDiagnosticHistory(),
  now = Date.now(),
): ResilienceModelHealthSnapshot[] {
  const models = [...new Set(events.flatMap((event) => [event.preferredModel, event.actualModel].filter((model): model is string => Boolean(model))))];
  return models.map((model) => deriveModel(events, model, now));
}

export function getModelHealth(model: string, now = Date.now()): ResilienceModelHealthSnapshot {
  return deriveModel(getResilienceDiagnosticHistory(), model, now);
}
