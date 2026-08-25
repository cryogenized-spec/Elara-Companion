import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('Google runtime/auth lifecycle paths use the canonical identity service', () => {
  const runtime = readFileSync(join(process.cwd(), 'src/lib/googleRuntime.ts'), 'utf8');
  const lifecycle = readFileSync(join(process.cwd(), 'src/lib/googleAuthLifecycleTool.ts'), 'utf8');

  assert.match(runtime, /from ['\"]\.\.\/services\/googleWorkspaceService['\"]/);
  assert.doesNotMatch(runtime, /from ['\"].*googleApi['\"]/);

  assert.match(lifecycle, /from ['\"]\.\.\/services\/googleWorkspaceService['\"]/);
  assert.doesNotMatch(lifecycle, /from ['\"].*googleApi['\"]/);
});
