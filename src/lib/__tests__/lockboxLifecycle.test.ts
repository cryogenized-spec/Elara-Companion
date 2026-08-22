import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateLifecycle } from '../../..//config/lockbox-lifecycle';

test('tracks a manual rotation policy without exposing a secret value', () => {
  const report = evaluateLifecycle({
    key: 'GEMINI_API_KEY',
    classification: 'CRITICAL_SECRET',
    lifecycle: {
      owner: 'platform',
      rotationMode: 'manual',
      recommendedDays: 90,
      expiryRequired: true,
    },
  });

  assert.equal(report.status, 'tracked');
  assert.equal(report.overdue, false);
  assert.deepEqual(report.lifecycle, {
    owner: 'platform',
    rotationMode: 'manual',
    recommendedDays: 90,
    expiryRequired: true,
  });
});

test('flags missing lifecycle policy instead of inventing one', () => {
  const report = evaluateLifecycle({
    key: 'EXAMPLE_SECRET',
    classification: 'CRITICAL_SECRET',
  });

  assert.equal(report.status, 'missing-policy');
  assert.equal(report.lifecycle.owner, 'unassigned');
  assert.equal(report.overdue, false);
});
