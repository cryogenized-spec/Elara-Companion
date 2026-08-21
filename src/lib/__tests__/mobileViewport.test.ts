import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

describe('mobile viewport resume contract', () => {
  it('keeps resume layout checkpoints but never restores editor focus', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'src/lib/mobileViewport.ts'),
      'utf8',
    );

    assert.match(source, /RESUME_SETTLE_DELAYS_MS = \[0, 120, 350, 700\]/);
    assert.match(source, /function blurActiveEditor\(\)/);
    assert.match(source, /window\.addEventListener\('blur', handleWindowBlur\)/);
    assert.match(source, /window\.addEventListener\('pagehide', handlePageHide\)/);
    assert.match(source, /window\.addEventListener\('focus', handleWindowFocus\)/);
    assert.match(source, /document\.addEventListener\('focusin', handleFocusIn\)/);
    assert.match(source, /scrollActiveEditorIntoView/);
    assert.doesNotMatch(source, /resumeTimers\.push\(-frame\);[\s\S]*scrollActiveEditorIntoView/);
  });
});
