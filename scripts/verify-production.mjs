import { spawnSync } from 'node:child_process';

const steps = [
  ['lockbox:verify', ['run', 'lockbox:verify']],
  ['lint', ['run', 'lint']],
  ['test', ['test']],
  ['benchmark:memory', ['run', 'benchmark:memory']],
  ['build', ['run', 'build']],
  ['bundle:budget', ['run', 'bundle:budget']],
];

for (const [label, args] of steps) {
  console.log(`\n=== Production verification: ${label} ===`);
  const result = spawnSync('npm', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nProduction verification passed: lockbox, lint/typecheck, tests, memory benchmark, build, and bundle budget.');
