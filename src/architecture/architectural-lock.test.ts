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

test('canonical Google authorization has exactly one implementation owner', async () => {
  const googleApi = await readText('src/lib/googleApi.ts');
  const authorization = await readText('src/lib/googleAuthorization.ts');

  assert.match(googleApi, /services\/googleWorkspaceService/);
  assert.doesNotMatch(googleApi, /let tokenClient\s*=|let accessToken\s*=|const SCOPES\s*=|initTokenClient\s*\(/);
  assert.match(authorization, /initTokenClient/);
  assert.match(authorization, /accessTokenExpiresAt/);
});

test('UI Google consumers use the feature-owned boundary', async () => {
  const files = await collectSourceFiles('src/components');
  const offenders: string[] = [];
  for (const file of files) {
    const source = await readText(file);
    if (source.includes("from '../lib/googleApi'") || source.includes('from "../lib/googleApi"')) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test('UI Workspace consumers use the application Workspace boundary', async () => {
  const files = await collectSourceFiles('src/components');
  const offenders: string[] = [];
  for (const file of files) {
    const source = await readText(file);
    if (source.includes("from '../lib/workspaceStorage'") || source.includes('from "../lib/workspaceStorage"')) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test('deleted legacy Keep implementation stays deleted', async () => {
  assert.equal(existsSync(join(root, 'src/legacy/googleKeepArchive.ts')), false);
});

test('production source contains no deleted legacy Keep import', async () => {
  const files = await collectSourceFiles('src');
  const offenders: string[] = [];
  for (const file of files) {
    const source = await readText(file);
    if (source.includes('legacy/googleKeepArchive')) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test('canonical reference archive owns historical Keep storage key deliberately', async () => {
  const source = await readText('src/services/referenceArchiveService.ts');
  assert.match(source, /elara_passive_keep_archive_v1/);
  assert.match(source, /createReferenceNote/);
  assert.match(source, /updateReferenceNote/);
});

test('Settings UI uses application-owned persistence and capability boundaries', async () => {
  const source = await readText('src/components/SettingsModal.tsx');
  assert.doesNotMatch(source, /from ['\"]\.\.\/lib\/db['\"]/);
  assert.doesNotMatch(source, /from ['\"]\.\.\/lib\/storage['\"]/);
  assert.doesNotMatch(source, /from ['\"]\.\.\/contracts\/implementations['\"]/);
  assert.match(source, /settingsPersistence\.loadPersonaSnapshots/);
  assert.match(source, /settingsPersistence\.savePersonaSnapshots/);
  assert.match(source, /getSettingsRateLimits/);
  assert.match(source, /getUpcomingCalendarEvents/);
  const googleImport = source.match(/import \{[\s\S]*?\} from ['\"]\.\.\/services\/settingsGoogleService['\"]/) ;
  assert.ok(googleImport, 'SettingsModal must import settingsGoogleService through the canonical boundary');
  assert.doesNotMatch(googleImport[0], /searchKeepNotes|createKeepNote|updateKeepNote|getKeepNote|deleteKeepNote|listKeepNotes/);
});

test('OOC UI surface delegates model execution to the application service', async () => {
  const source = await readText('src/components/OocConversationPanel.tsx');
  assert.doesNotMatch(source, /GoogleGenAI|generateContentStream|buildRuntimeConfig|from ['\"]\.\.\/lib\/chatRuntime['\"]/);
  assert.doesNotMatch(source, /from ['\"]\.\.\/lib\/contextManager['\"]/);
  assert.match(source, /streamOocResponse/);
  assert.match(source, /loadOocSettings/);
  assert.match(source, /appendOocMessage/);
});

test('OOC execution owns provider access behind the runtime contract', async () => {
  const source = await readText('src/services/oocConversationService.ts');
  assert.match(source, /geminiRuntimeContract\.stream/);
  assert.doesNotMatch(source, /new GoogleGenAI/);
  assert.match(source, /delete config\.tools/);
});

test('Scratchpad service bypasses the legacy context-manager wrapper', async () => {
  const source = await readText('src/services/scratchpadService.ts');
  assert.match(source, /from ['\"]\.\.\/lib\/contextProjectionStorage['\"]/);
  assert.doesNotMatch(source, /from ['\"]\.\.\/lib\/contextManager['\"]/);
});

test('Workspace background reconciliation uses the application persistence boundary', async () => {
  const source = await readText('src/services/workspaceBackgroundService.ts');
  assert.match(source, /from ['\"]\.\/workspacePersistenceService['\"]/);
  assert.doesNotMatch(source, /from ['\"]\.\.\/lib\/workspaceStorage['\"]/);
});

test('Workspace editor delegates application mutations to the Workspace service', async () => {
  const source = await readText('src/services/workspaceEditorService.ts');
  assert.match(source, /from ['\"]\.\/workspaceService['\"]/);
  assert.match(source, /createArtifact: workspaceService\.createArtifact/);
  assert.match(source, /deleteArtifact: workspaceService\.deleteArtifact/);
  assert.match(source, /updateArtifact: workspaceService\.updateArtifact/);
  assert.doesNotMatch(source, /from ['\"]\.\.\/lib\/workspaceStorage['\"]/);
});

test('Workspace tools use canonical Google and reference-archive services directly', async () => {
  const source = await readText('src/lib/workspaceTools.ts');
  assert.doesNotMatch(source, /from ['\"]\.\/googleApi['\"]/);
  assert.doesNotMatch(source, /legacy\/googleKeepArchive/);
  assert.match(source, /services\/googleDocsDriveService/);
  assert.match(source, /services\/googleWorkspaceService/);
  assert.match(source, /services\/referenceArchiveService/);
});

test('Background terminal reconciliation is idempotent per durable job id', async () => {
  const source = await readText('src/services/backgroundApplicationService.ts');
  assert.match(source, /const reconciledJobIds = new Set<string>\(\);/);
  assert.match(source, /if \(reconciledJobIds\.has\(status\.id\)\) return status;/);
  assert.match(source, /reconciledJobIds\.add\(status\.id\);/);
  assert.match(source, /reconcileBackgroundWorkspaceResult\(status\);/);
});
