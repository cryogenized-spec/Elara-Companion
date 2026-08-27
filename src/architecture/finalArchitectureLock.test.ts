import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));

async function readText(path: string): Promise<string> {
  return readFile(join(root, path), 'utf8');
}

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(join(root, dir), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relative = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectSourceFiles(relative));
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) files.push(relative);
  }
  return files;
}

test('final architecture: deleted legacy Keep implementation remains absent', () => {
  assert.equal(existsSync(join(root, 'src/legacy/googleKeepArchive.ts')), false);
});

test('final architecture: no production source imports deleted Keep implementation', async () => {
  const files = await collectSourceFiles('src');
  const offenders: string[] = [];
  for (const file of files) {
    const source = await readText(file);
    if (source.includes('legacy/googleKeepArchive')) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test('final architecture: UI cannot own Google or Workspace infrastructure', async () => {
  const files = await collectSourceFiles('src/components');
  const offenders: string[] = [];
  for (const file of files) {
    const source = await readText(file);
    if (/from ['\"]\.\.\/lib\/(googleApi|workspaceStorage)['\"]/.test(source)) offenders.push(file);
    if (/GoogleGenAI|generateContentStream/.test(source)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test('final architecture: canonical OAuth authority remains singular', async () => {
  const googleApi = await readText('src/lib/googleApi.ts');
  const authorization = await readText('src/lib/googleAuthorization.ts');
  assert.doesNotMatch(googleApi, /initTokenClient\s*\(|let tokenClient\s*=|let accessToken\s*=|const SCOPES\s*=/);
  assert.match(authorization, /initTokenClient\s*\(/);
});

test('final architecture: compatibility façades delegate rather than implement', async () => {
  const contextManager = await readText('src/lib/contextManager.ts');
  assert.match(contextManager, /chatContextService/);
  assert.doesNotMatch(contextManager, /inspectMemoryRetrieval|retrieveRelevantMemories|function buildSystemPayload/);

  const googleApi = await readText('src/lib/googleApi.ts');
  assert.match(googleApi, /googleWorkspaceService/);
  assert.doesNotMatch(googleApi, /new GoogleGenAI|generateContentStream/);
});

test('final architecture: Workspace boundaries remain explicit', async () => {
  const background = await readText('src/services/workspaceBackgroundService.ts');
  const editor = await readText('src/services/workspaceEditorService.ts');
  assert.match(background, /workspacePersistenceService/);
  assert.doesNotMatch(background, /\.\.\/lib\/workspaceStorage/);
  assert.match(editor, /workspaceService/);
  assert.doesNotMatch(editor, /\.\.\/lib\/workspaceStorage/);
});

test('final architecture: OOC execution explicitly disables tools', async () => {
  const source = await readText('src/services/oocConversationService.ts');
  assert.match(source, /geminiRuntimeContract\.stream/);
  assert.match(source, /enableTools:\s*false/);
});

test('final architecture: Settings UI remains behind application services', async () => {
  const source = await readText('src/components/SettingsModal.tsx');
  assert.doesNotMatch(source, /from ['\"]\.\.\/lib\/(db|storage)['\"]/);
  assert.doesNotMatch(source, /from ['\"]\.\.\/contracts\/implementations['\"]/);
  assert.match(source, /settingsPersistence/);
  assert.match(source, /settingsGoogleService/);
});
