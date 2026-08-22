export type LockboxRotationMode = 'manual' | 'automatable' | 'runtime-managed' | 'not-applicable';

export type LockboxLifecycle = {
  owner: string;
  rotationMode: LockboxRotationMode;
  recommendedDays?: number;
  expiryRequired: boolean;
  notes?: string;
};

export type LockboxLifecycleStatus = 'tracked' | 'missing-policy';

export type LockboxLifecycleReport = {
  key: string;
  classification: string;
  lifecycle: LockboxLifecycle;
  status: LockboxLifecycleStatus;
  ageDays?: number;
  overdue: boolean;
};

export function evaluateLifecycle(
  entry: { key: string; classification: string; lifecycle?: LockboxLifecycle },
  now = new Date(),
): LockboxLifecycleReport {
  const lifecycle = entry.lifecycle;
  if (!lifecycle) {
    return {
      key: entry.key,
      classification: entry.classification,
      lifecycle: {
        owner: 'unassigned',
        rotationMode: 'not-applicable',
        expiryRequired: false,
      },
      status: 'missing-policy',
      overdue: false,
    };
  }

  return {
    key: entry.key,
    classification: entry.classification,
    lifecycle,
    status: 'tracked',
    overdue: false,
  };
}
