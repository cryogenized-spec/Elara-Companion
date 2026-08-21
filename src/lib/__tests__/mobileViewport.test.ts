import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

describe('mobile viewport resume contract', () => {
  it('keeps delayed Android IME resync checkpoints and active-editor recovery', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'src/lib/mobileViewport.ts'),
      'utf8',
    );

    assert.match(source, /RESUME_SETTLE_DELAYS_MS = \[0, 120, 350, 700\]/);
    assert.match(source, /document\.addEventListener\('focusin', handleFocusIn\)/);
    assert.match(source, /scrollActiveEditorIntoView/);
    assert.match(source, /window\.setTimeout\(update, 120\)/);
    assert.match(source, /window\.setTimeout\(\(\) => \{[\s\S]*scrollActiveEditorIntoView\(\)/);
  });
});
