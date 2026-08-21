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

    const scheduleResumeMatch = source.match(/const scheduleResumeSync = \(\) => \{[\s\S]*?\n  \};/);
    assert.ok(scheduleResumeMatch, 'resume scheduler should remain explicit');
    const scheduleResumeSource = scheduleResumeMatch[0];
    assert.match(scheduleResumeSource, /resumeTimers\.push\(-frame\)/);
    assert.doesNotMatch(scheduleResumeSource, /scrollActiveEditorIntoView/);

    const focusInMatch = source.match(/const handleFocusIn = \(event: FocusEvent\) => \{[\s\S]*?\n  \};/);
    assert.ok(focusInMatch, 'user focus recovery should remain explicit');
    assert.match(focusInMatch[0], /scrollActiveEditorIntoView/);
  });
});
