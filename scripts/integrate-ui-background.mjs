import fs from 'node:fs';

function edit(path, transform, label) {
  const original = fs.readFileSync(path, 'utf8');
  const updated = transform(original);
  if (updated === original) throw new Error(`${label}: no changes were made`);
  fs.writeFileSync(path, updated);
  console.log(`${label}: updated`);
}

edit('src/components/SettingsModal.tsx', (source) => {
  const importAnchor = "import { loadRateLimits } from '../lib/storage';";
  const importLine = "import { GoogleWorkspaceSettingsPanel } from './GoogleWorkspaceSettingsPanel';";
  let next = source.includes(importLine) ? source : source.replace(importAnchor, `${importAnchor}\n${importLine}`);
  const startMarker = '          {/* TAB: GOOGLE WORKSPACE & SYNC */}';
  const endMarker = '          {/* TAB: VOICE & SPEECH-TO-TEXT */}';
  const start = next.indexOf(startMarker);
  const end = next.indexOf(endMarker, start);
  if (start < 0 || end < 0 || end <= start) throw new Error('Google Workspace tab markers not found');
  const replacement = `          {/* TAB: GOOGLE WORKSPACE & SYNC */}\n          {activeTab === 'workspace' && (\n            <GoogleWorkspaceSettingsPanel />\n          )}\n\n`;
  return next.slice(0, start) + replacement + next.slice(end);
}, 'SettingsModal');

edit('src/components/WorkspaceView.tsx', (source) => {
  let next = source;
  const importAnchor = "import { MarkdownRenderer } from './MarkdownRenderer';";
  const importLine = "import { ArtifactsPanel } from './ArtifactsPanel';";
  if (!next.includes(importLine)) next = next.replace(importAnchor, `${importAnchor}\n${importLine}`);
  if (!next.includes('const [artifactsOpen, setArtifactsOpen]')) {
    next = next.replace(
      "  const [newMenuOpen, setNewMenuOpen] = useState(false);",
      "  const [newMenuOpen, setNewMenuOpen] = useState(false);\n  const [artifactsOpen, setArtifactsOpen] = useState(false);"
    );
  }
  const oldArtifactsButton = '<button onClick={() => setDrawerOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="Artifacts"><Menu className="h-4 w-4" /></button>';
  const newArtifactsButton = '<button onClick={() => setArtifactsOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="Artifacts"><Menu className="h-4 w-4" /></button>';
  if (!next.includes(newArtifactsButton)) next = next.replace(oldArtifactsButton, newArtifactsButton);
  const mainMarker = '      <main className="min-h-0 flex-1 overflow-hidden">';
  if (!next.includes('{artifactsOpen &&')) {
    const overlay = `      {artifactsOpen && (\n        <ArtifactsPanel\n          onOpenArtifact={(id) => { setArtifactsOpen(false); handleSelect(id); }}\n          onBack={() => setArtifactsOpen(false)}\n        />\n      )}\n\n`;
    if (!next.includes(mainMarker)) throw new Error('Workspace main marker not found');
    next = next.replace(mainMarker, overlay + mainMarker);
  }
  return next;
}, 'WorkspaceView');

edit('src/components/Sidebar.tsx', (source) => source.replace('<span>Workspace & Artifacts</span>', '<span>Artifacts</span>'), 'Sidebar');

edit('src/App.tsx', (source) => {
  let next = source;
  const importAnchor = "import { getAccessToken } from './lib/googleApi';";
  const importLine = "import { prepareBackgroundService, notifyBackgroundCompletion } from './lib/backgroundService';";
  if (!next.includes(importLine)) next = next.replace(importAnchor, `${importAnchor}\n${importLine}`);

  const signatureEnd = "  ) => {\n    setIsStreaming(true);";
  if (next.includes(signatureEnd) && !next.includes('void prepareBackgroundService();')) {
    next = next.replace(signatureEnd, "  ) => {\n    void prepareBackgroundService();\n    setIsStreaming(true);");
  }

  const watchdogStart = '    // Watchdog interval to catch stalled background processes on mobile';
  const watchdogEnd = '    const streamArtifactIds: string[] = [];';
  const wi = next.indexOf(watchdogStart);
  const wj = next.indexOf(watchdogEnd, wi);
  if (wi >= 0 && wj > wi) {
    next = next.slice(0, wi) + '    // Background-safe streaming: do not abort simply because the document is hidden.\n\n' + next.slice(wj);
  }

  next = next.replace('      clearInterval(watchdogInterval);\n      document.removeEventListener(\'visibilitychange\', handleVisibilityChange);\n', '');

  const successAnchor = '      // Autonomous Background Long-Term Memory Extraction';
  const completionCall = '      void notifyBackgroundCompletion(\n        \'Elara finished thinking\',\n        finalCleanContent.trim().slice(0, 180) || \'Your response is ready.\',\n      );\n\n';
  if (!next.includes('void notifyBackgroundCompletion(') && next.includes(successAnchor)) {
    next = next.replace(successAnchor, completionCall + successAnchor);
  }
  return next;
}, 'App');

console.log('UI + background integration completed.');
