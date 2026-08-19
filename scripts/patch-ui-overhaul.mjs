import fs from 'node:fs';

const settingsPath = 'src/components/SettingsModal.tsx';
const settings = fs.readFileSync(settingsPath, 'utf8');
const importAnchor = "import { loadRateLimits } from '../lib/storage';";
const importLine = "import { GoogleWorkspaceSettingsPanel } from './GoogleWorkspaceSettingsPanel';";
let nextSettings = settings.includes(importLine) ? settings : settings.replace(importAnchor, `${importAnchor}\n${importLine}`);
const workspaceStart = '          {/* TAB: GOOGLE WORKSPACE & SYNC */}';
const workspaceEnd = '          {/* TAB: VOICE & SPEECH-TO-TEXT */}';
const start = nextSettings.indexOf(workspaceStart);
const end = nextSettings.indexOf(workspaceEnd, start);
if (start < 0 || end < 0 || end <= start) throw new Error('Could not locate Google Workspace tab markers in SettingsModal.tsx');
const replacement = `          {/* TAB: GOOGLE WORKSPACE & SYNC */}\n          {activeTab === 'workspace' && (\n            <GoogleWorkspaceSettingsPanel />\n          )}\n\n`;
nextSettings = nextSettings.slice(0, start) + replacement + nextSettings.slice(end);
fs.writeFileSync(settingsPath, nextSettings);

const workspacePath = 'src/components/WorkspaceView.tsx';
const workspace = fs.readFileSync(workspacePath, 'utf8');
let nextWorkspace = workspace;
const workspaceImport = "import { ArtifactsPanel } from './ArtifactsPanel';";
if (!nextWorkspace.includes(workspaceImport)) nextWorkspace = nextWorkspace.replace("import { MarkdownRenderer } from './MarkdownRenderer';", "import { MarkdownRenderer } from './MarkdownRenderer';\n" + workspaceImport);
if (!nextWorkspace.includes("const [artifactsOpen, setArtifactsOpen] = useState(false);")) {
  nextWorkspace = nextWorkspace.replace("  const [newMenuOpen, setNewMenuOpen] = useState(false);", "  const [newMenuOpen, setNewMenuOpen] = useState(false);\n  const [artifactsOpen, setArtifactsOpen] = useState(false);");
}
const artifactButtonOld = '<button onClick={() => setDrawerOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="Artifacts"><Menu className="h-4 w-4" /></button>';
const artifactButtonNew = '<button onClick={() => setArtifactsOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="Artifacts"><Menu className="h-4 w-4" /></button>';
if (!nextWorkspace.includes(artifactButtonNew)) nextWorkspace = nextWorkspace.replace(artifactButtonOld, artifactButtonNew);
const mainMarker = '      <main className="min-h-0 flex-1 overflow-hidden">';
if (!nextWorkspace.includes('{artifactsOpen && <ArtifactsPanel')) {
  const overlay = `      {artifactsOpen && (\n        <ArtifactsPanel\n          onOpenArtifact={(id) => { setArtifactsOpen(false); handleSelect(id); }}\n          onBack={() => setArtifactsOpen(false)}\n        />\n      )}\n\n`;
  nextWorkspace = nextWorkspace.replace(mainMarker, overlay + mainMarker);
}
fs.writeFileSync(workspacePath, nextWorkspace);

const sidebarPath = 'src/components/Sidebar.tsx';
const sidebar = fs.readFileSync(sidebarPath, 'utf8');
const nextSidebar = sidebar.replace('<span>Workspace & Artifacts</span>', '<span>Artifacts</span>');
fs.writeFileSync(sidebarPath, nextSidebar);

console.log('UI overhaul patch applied.');
