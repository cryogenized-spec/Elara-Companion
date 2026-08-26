import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Workspace, WorkspaceArtifact, ArtifactRevision } from '../types';
import { workspaceEditorService } from '../services/workspaceEditorService';
const { getWorkspace, saveWorkspace, selectArtifact: setActiveArtifact, createArtifact, deleteArtifact, updateArtifact, checkpoint: createCheckpoint, restoreRevision, compareRevisions } = workspaceEditorService;
import { executeAnyWorkspaceTool } from '../lib/workspaceTools';

import { MarkdownRenderer } from './MarkdownRenderer';
import { AlertTriangle, ArrowLeft, Check, Clock3, Code2, Columns3, Download, Eye, FileText, FileType2, History, Menu, MoreHorizontal, Plus, RefreshCw, Save, X } from 'lucide-react';

interface WorkspaceViewProps {
  activeArtifactId?: string | null;
  onSelectArtifact?: (id: string) => void;
  onBackToChat?: () => void;
  onOpenSidebar?: () => void;
}

const statusLabel = (artifact: WorkspaceArtifact) => {
  if (artifact.provider !== 'google_docs') return null;
  switch (artifact.syncStatus) {
    case 'synchronized': return 'Synced';
    case 'local_ahead': return 'Local changes';
    case 'remote_ahead': return 'Google changes';
    case 'conflict': return 'Conflict';
    case 'linked': return 'Linked';
    default: return 'Google Doc';
  }
};

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ activeArtifactId: propActiveArtifactId, onSelectArtifact, onBackToChat, onOpenSidebar }) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [localContent, setLocalContent] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [canvasMode, setCanvasMode] = useState<'raw' | 'read' | 'split'>('raw');
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [compareRevisionId, setCompareRevisionId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [googleLinkOpen, setGoogleLinkOpen] = useState(false);
  const [googleDocId, setGoogleDocId] = useState('');
  const [googleLinkMode, setGoogleLinkMode] = useState<'compare_only' | 'local_to_google' | 'google_to_local'>('compare_only');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(localContent);
  const activeRef = useRef<WorkspaceArtifact | null>(null);

  contentRef.current = localContent;

  const activeArtifact = useMemo(() => workspace?.artifacts.find((a) => a.id === workspace.activeArtifactId) || null, [workspace]);
  activeRef.current = activeArtifact;

  const persistCurrent = useCallback((source: 'user' | 'agent' = 'user') => {
    const artifact = activeRef.current;
    let ws = getWorkspace();
    if (!artifact) return ws;
    if (contentRef.current !== artifact.content) ws = updateArtifact(ws, artifact.id, { content: contentRef.current });
    ws = createCheckpoint(ws, artifact.id, source, source);
    saveWorkspace(ws);
    return ws;
  }, []);

  useEffect(() => {
    const ws = getWorkspace();
    const targetId = propActiveArtifactId || ws.activeArtifactId;
    if (targetId && ws.artifacts.some((a) => a.id === targetId)) {
      ws.activeArtifactId = targetId;
      saveWorkspace(ws);
    }
    setWorkspace(ws);
    setLocalContent(ws.artifacts.find((a) => a.id === ws.activeArtifactId)?.content || '');
    setCanvasMode('raw');
  }, [propActiveArtifactId]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    persistCurrent('user');
  }, [persistCurrent]);

  const flush = useCallback(() => {
    if (!workspace || !activeArtifact) return workspace;
    let ws = workspace;
    if (contentRef.current !== activeArtifact.content) {
      ws = updateArtifact(ws, activeArtifact.id, { content: contentRef.current });
      saveWorkspace(ws);
    }
    return ws;
  }, [workspace, activeArtifact]);

  const handleContentChange = (value: string) => {
    setLocalContent(value);
    contentRef.current = value;
    if (!activeArtifact) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setWorkspace((current) => current ? updateArtifact(current, activeArtifact.id, { content: value }) : current);
    }, 350);
  };

  const handleSelect = (id: string) => {
    const ws = flush();
    const checkpointed = activeArtifact ? createCheckpoint(ws, activeArtifact.id, 'user', 'user') : ws;
    const next = setActiveArtifact(id);
    const merged: Workspace = { ...next, artifacts: checkpointed.artifacts };
    saveWorkspace(merged);
    setWorkspace(merged);
    setLocalContent(merged.artifacts.find((a) => a.id === id)?.content || '');
    setCanvasMode('raw');
    setDrawerOpen(false);
    onSelectArtifact?.(id);
  };

  const handleCreate = (type: 'markdown' | 'text') => {
    const ws = flush();
    const checkpointed = activeArtifact ? createCheckpoint(ws, activeArtifact.id, 'user', 'user') : ws;
    const next = createArtifact(checkpointed, type === 'markdown' ? 'Untitled.md' : 'Untitled', type);
    saveWorkspace(next);
    setWorkspace(next);
    setLocalContent('');
    setCanvasMode('raw');
    setNewMenuOpen(false);
    setDrawerOpen(false);
    if (next.activeArtifactId) onSelectArtifact?.(next.activeArtifactId);
  };

  const handleDelete = (id: string) => {
    if (!workspace) return;
    if (deleteId !== id) { setDeleteId(id); return; }
    const next = deleteArtifact(workspace, id);
    saveWorkspace(next);
    setWorkspace(next);
    setLocalContent(next.artifacts.find((a) => a.id === next.activeArtifactId)?.content || '');
    setDeleteId(null);
    onSelectArtifact?.(next.activeArtifactId || '');
  };

  const handleRename = (artifact: WorkspaceArtifact) => {
    if (!workspace || !renameValue.trim()) return;
    const next = updateArtifact(workspace, artifact.id, { name: renameValue.trim() });
    saveWorkspace(next);
    setWorkspace(next);
    setRenameId(null);
  };

  const handleCheckpoint = () => {
    if (!activeArtifact) return;
    const ws = flush();
    const next = createCheckpoint(ws, activeArtifact.id, 'user', 'user');
    saveWorkspace(next);
    setWorkspace(next);
  };

  const runGoogleTool = async (name: string, args: any) => {
    if (!workspace || !activeArtifact) return;
    setBusy(true);
    try {
      const result = await executeAnyWorkspaceTool(flush(), name, args);
      if (result.updatedWorkspace) {
        saveWorkspace(result.updatedWorkspace);
        setWorkspace(result.updatedWorkspace);
        setLocalContent(result.updatedWorkspace.artifacts.find((a) => a.id === activeArtifact.id)?.content || '');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLinkGoogle = async () => {
    if (!workspace || !activeArtifact || !googleDocId.trim()) return;
    setBusy(true);
    try {
      const result = await executeAnyWorkspaceTool(flush(), 'link_google_doc', { artifactId: activeArtifact.id, documentId: googleDocId.trim(), initialSyncMode: googleLinkMode });
      if (result.updatedWorkspace) {
        saveWorkspace(result.updatedWorkspace);
        setWorkspace(result.updatedWorkspace);
        setLocalContent(result.updatedWorkspace.artifacts.find((a) => a.id === activeArtifact.id)?.content || '');
      }
    } finally {
      setBusy(false);
      setGoogleLinkOpen(false);
      setGoogleDocId('');
    }
  };

  const handleSaveKeep = async () => {
    if (!workspace || !activeArtifact) return;
    setBusy(true);
    try {
      await executeAnyWorkspaceTool(flush(), 'create_keep_note', { title: activeArtifact.name, content: contentRef.current, tags: ['workspace', activeArtifact.type || 'document'] });
    } finally {
      setBusy(false);
    }
  };

  const revisions = useMemo<ArtifactRevision[]>(() => [...(activeArtifact?.revisions || [])].sort((a, b) => a.revisionNumber - b.revisionNumber), [activeArtifact]);
  const compareResult = useMemo(() => {
    if (!workspace || !activeArtifact || !compareOpen || !selectedRevisionId) return null;
    return compareRevisions(workspace, activeArtifact.id, compareRevisionId, selectedRevisionId);
  }, [workspace, activeArtifact, compareOpen, compareRevisionId, selectedRevisionId]);

  if (!workspace) return null;
  const status = activeArtifact ? statusLabel(activeArtifact) : null;

  return (
    <div className="fixed inset-0 z-20 flex h-[100dvh] w-full flex-col bg-[#09090b] text-zinc-100">
      <header className="flex min-h-14 items-center gap-2 border-b border-zinc-800 bg-[#0d0d0f]/95 px-3 backdrop-blur-xl">
        <button onClick={() => { persistCurrent('user'); if (onBackToChat) onBackToChat(); else onOpenSidebar?.(); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="Back to chat"><ArrowLeft className="h-4 w-4" /></button>
        <button onClick={() => setDrawerOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="Artifacts"><Menu className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {activeArtifact?.type === 'markdown' ? <FileType2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <FileText className="h-4 w-4 shrink-0 text-sky-400" />}
            <div className="truncate text-sm font-semibold">{activeArtifact?.name || 'Workspace'}</div>
          </div>
          {status && <div className="truncate text-[10px] text-zinc-500">{status}</div>}
        </div>
        {activeArtifact?.type === 'markdown' && <div className="flex shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5" role="group" aria-label="Canvas view mode"><button onClick={() => setCanvasMode('raw')} className={`flex h-8 items-center gap-1 rounded-md px-2 text-[11px] ${canvasMode === 'raw' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`} title="Raw Markdown"><Code2 className="h-3.5 w-3.5" />Raw</button><button onClick={() => setCanvasMode('read')} className={`flex h-8 items-center gap-1 rounded-md px-2 text-[11px] ${canvasMode === 'read' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`} title="Rendered reading view"><Eye className="h-3.5 w-3.5" />Read</button><button onClick={() => setCanvasMode('split')} className={`flex h-8 items-center gap-1 rounded-md px-2 text-[11px] ${canvasMode === 'split' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`} title="Source and reading view"><Columns3 className="h-3.5 w-3.5" />Split</button></div>}
        <button onClick={() => setNewMenuOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><Plus className="h-4 w-4" /></button>
        <button onClick={() => setHistoryOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="History"><History className="h-4 w-4" /></button>
        <button onClick={() => setDrawerOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="More"><MoreHorizontal className="h-4 w-4" /></button>
      </header>

      {newMenuOpen && <div className="absolute right-3 top-16 z-40 w-44 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl"><button onClick={() => handleCreate('markdown')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs hover:bg-zinc-800"><FileType2 className="h-4 w-4 text-emerald-400" />New Markdown</button><button onClick={() => handleCreate('text')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs hover:bg-zinc-800"><FileText className="h-4 w-4 text-sky-400" />New Text</button><button onClick={() => { setHistoryOpen(true); setNewMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs hover:bg-zinc-800"><Clock3 className="h-4 w-4 text-amber-400" />History</button></div>}

      <main className="min-h-0 flex-1 overflow-hidden">
        {activeArtifact ? (activeArtifact.type !== 'markdown' || canvasMode === 'raw' ? <textarea value={localContent} onChange={(e) => handleContentChange(e.target.value)} placeholder="Start writing…" className="h-full min-h-0 w-full resize-none bg-transparent px-4 py-5 font-mono text-[13px] leading-7 text-zinc-200 outline-none placeholder:text-zinc-700 sm:px-8" spellCheck={false} /> : canvasMode === 'read' ? <div className="min-h-0 h-full overflow-y-auto px-4 py-5 sm:px-8"><div className="mx-auto w-full max-w-3xl"><MarkdownRenderer content={localContent} /></div></div> : <div className="grid h-full min-h-0 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1"><div className="min-h-0 overflow-hidden border-b border-zinc-800 lg:border-b-0 lg:border-r"><textarea value={localContent} onChange={(e) => handleContentChange(e.target.value)} placeholder="Markdown source…" className="h-full min-h-0 w-full resize-none bg-transparent px-4 py-5 font-mono text-[13px] leading-7 text-zinc-200 outline-none placeholder:text-zinc-700 sm:px-6" spellCheck={false} aria-label="Markdown source" /></div><div className="min-h-0 overflow-y-auto bg-zinc-950/20 px-4 py-5 sm:px-6"><div className="mx-auto w-full max-w-3xl"><MarkdownRenderer content={localContent} /></div></div></div>) : <div className="flex h-full items-center justify-center p-6 text-center"><div className="space-y-4"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-600"><FileText className="h-7 w-7" /></div><p className="text-sm text-zinc-400">No document open.</p><button onClick={() => handleCreate('markdown')} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">Create Markdown</button></div></div>}
      </main>

      {activeArtifact && <footer className="flex min-h-12 items-center gap-2 overflow-x-auto border-t border-zinc-800 bg-[#0d0d0f]/95 px-3 backdrop-blur-xl"><span className="shrink-0 text-[10px] text-zinc-500">{localContent.trim() ? localContent.trim().split(/\s+/).length : 0} words</span><span className="h-4 w-px shrink-0 bg-zinc-800" /><button onClick={handleCheckpoint} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-800"><Save className="h-3.5 w-3.5" />Checkpoint</button><button onClick={() => setHistoryOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-800"><History className="h-3.5 w-3.5" />History</button>{activeArtifact.provider === 'google_docs' && activeArtifact.url && <a href={activeArtifact.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 rounded-lg bg-blue-950/50 px-2.5 py-1.5 text-[11px] text-blue-300">Google Docs</a>}<button disabled={busy} onClick={handleSaveKeep} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-300 hover:bg-amber-950/40 disabled:opacity-40"><Download className="h-3.5 w-3.5" />Keep</button>{activeArtifact.provider === 'google_docs' && <><button disabled={busy} onClick={() => runGoogleTool('refresh_google_doc', { artifactId: activeArtifact.id })} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-800"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Refresh</button>{activeArtifact.syncStatus === 'local_ahead' && <button disabled={busy} onClick={() => runGoogleTool('sync_to_google_doc', { artifactId: activeArtifact.id, force: false })} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-300 hover:bg-emerald-950/40">Push</button>}{activeArtifact.syncStatus === 'remote_ahead' && <button disabled={busy} onClick={() => runGoogleTool('sync_from_google_doc', { artifactId: activeArtifact.id, force: false })} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-blue-300 hover:bg-blue-950/40">Pull</button>}</>}<button onClick={() => setGoogleLinkOpen(true)} className="ml-auto inline-flex shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-800">Link Google Doc</button></footer>}

      {drawerOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}><aside className="absolute left-0 top-0 flex h-full w-[min(88vw,360px)] flex-col border-r border-zinc-800 bg-[#111113] shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex min-h-14 items-center justify-between border-b border-zinc-800 px-4"><div><div className="text-sm font-semibold">{workspace.name}</div><div className="text-[10px] text-zinc-500">{workspace.artifacts.length} documents</div></div><button onClick={() => setDrawerOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400"><X className="h-4 w-4" /></button></div><div className="flex-1 overflow-y-auto p-3"><div className="mb-3 grid grid-cols-2 gap-2"><button onClick={() => handleCreate('markdown')} className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 px-3 py-3 text-xs text-emerald-300">+ Markdown</button><button onClick={() => handleCreate('text')} className="rounded-xl border border-sky-800/60 bg-sky-950/30 px-3 py-3 text-xs text-sky-300">+ Text</button></div><div className="space-y-2">{workspace.artifacts.map((artifact) => { const isActive = artifact.id === workspace.activeArtifactId; return <div key={artifact.id} className={`rounded-xl border p-3 ${isActive ? 'border-emerald-700/60 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-900/40'}`}><button onClick={() => handleSelect(artifact.id)} className="flex w-full items-center gap-2 text-left">{artifact.type === 'markdown' ? <FileType2 className="h-4 w-4 text-emerald-400" /> : <FileText className="h-4 w-4 text-sky-400" />}<span className="min-w-0 flex-1 truncate text-xs font-medium">{artifact.name}</span>{artifact.provider === 'google_docs' && <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] text-blue-300">G-Doc</span>}</button><div className="mt-2 flex items-center gap-2">{renameId === artifact.id ? <div className="flex flex-1 gap-1"><input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-[11px] outline-none" /><button onClick={() => handleRename(artifact)} className="rounded-lg p-1.5 text-emerald-400"><Check className="h-3.5 w-3.5" /></button></div> : <><button onClick={() => { setRenameId(artifact.id); setRenameValue(artifact.name); }} className="rounded-lg px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800">Rename</button><button onClick={() => handleDelete(artifact.id)} className="rounded-lg px-2 py-1 text-[10px] text-red-400 hover:bg-red-950/30">{deleteId === artifact.id ? 'Confirm delete' : 'Delete'}</button>{deleteId === artifact.id && <button onClick={() => setDeleteId(null)} className="rounded-lg p-1.5 text-zinc-500"><X className="h-3 w-3" /></button>}</>}</div></div>; })}</div></div></aside></div>}

      {historyOpen && activeArtifact && <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" onClick={() => setHistoryOpen(false)}><section className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-3xl border border-zinc-800 bg-[#111113] shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3"><div><div className="text-sm font-semibold">Revision History</div><div className="text-[10px] text-zinc-500">{activeArtifact.name}</div></div><button onClick={() => setHistoryOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400"><X className="h-4 w-4" /></button></div><div className="flex gap-2 border-b border-zinc-800 px-4 py-3"><select value={selectedRevisionId || ''} onChange={(e) => setSelectedRevisionId(e.target.value || null)} className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"><option value="">From revision…</option>{revisions.map((r) => <option key={r.id} value={r.id}>Revision {r.revisionNumber}</option>)}</select><select value={compareRevisionId || ''} onChange={(e) => setCompareRevisionId(e.target.value || null)} className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"><option value="">To revision…</option>{revisions.map((r) => <option key={r.id} value={r.id}>Revision {r.revisionNumber}</option>)}</select><button disabled={!selectedRevisionId || !compareRevisionId || selectedRevisionId === compareRevisionId} onClick={() => setCompareOpen(true)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Compare</button></div><div className="max-h-[55dvh] overflow-y-auto px-4 py-3">{[...revisions].reverse().map((r) => <div key={r.id} className="mb-2 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3"><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-semibold">Revision {r.revisionNumber}</div><div className="text-[10px] text-zinc-500">{r.source} · {new Date(r.createdAt).toLocaleString()}</div></div><button onClick={() => { const next = restoreRevision(workspace, activeArtifact.id, r.id); saveWorkspace(next); setWorkspace(next); setLocalContent(r.content); setHistoryOpen(false); }} className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[10px] text-zinc-300">Restore</button></div></div>)}</div></section></div>}

      {compareOpen && compareResult && <div className="fixed inset-0 z-[60] bg-[#09090b]"><div className="flex h-full flex-col"><header className="flex min-h-14 items-center justify-between border-b border-zinc-800 px-4"><div><div className="text-sm font-semibold">Revision comparison</div><div className="text-[10px] text-zinc-500">Read-only</div></div><button onClick={() => setCompareOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400"><X className="h-4 w-4" /></button></header><div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-6">{compareResult.hunks?.map((h: any, i: number) => <div key={i} className={`whitespace-pre-wrap rounded px-2 py-0.5 ${h.type === 'local_added' ? 'bg-emerald-950/30 text-emerald-300' : h.type === 'remote_removed' ? 'bg-red-950/30 text-red-300' : 'text-zinc-500'}`}><span className="mr-2 text-zinc-700">{h.type === 'local_added' ? '+' : h.type === 'remote_removed' ? '-' : ' '}</span>{h.value}</div>)}{compareResult.identical && <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300">Identical — no changes.</div>}</div></div></div>}

      {googleLinkOpen && activeArtifact && <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setGoogleLinkOpen(false)}><section className="absolute inset-x-3 bottom-3 rounded-2xl border border-zinc-800 bg-[#111113] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="mb-3 flex items-center justify-between"><div className="text-sm font-semibold">Link Google Doc</div><button onClick={() => setGoogleLinkOpen(false)} className="rounded-lg p-1.5 text-zinc-500"><X className="h-4 w-4" /></button></div><input value={googleDocId} onChange={(e) => setGoogleDocId(e.target.value)} placeholder="Google Doc URL or document ID" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs outline-none" /><div className="mt-3 grid grid-cols-1 gap-2">{[['compare_only', 'Compare only'], ['local_to_google', 'Use local as starting version'], ['google_to_local', 'Use Google as starting version']].map(([mode, label]) => <label key={mode} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><input type="radio" checked={googleLinkMode === mode} onChange={() => setGoogleLinkMode(mode as any)} className="mt-0.5" /><span className="text-xs text-zinc-300">{label}</span></label>)}</div><button disabled={!googleDocId.trim() || busy} onClick={handleLinkGoogle} className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white disabled:opacity-40">Link document</button></section></div>}

      {busy && <div className="pointer-events-none fixed bottom-16 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-zinc-800 bg-zinc-950/95 px-3 py-1.5 text-[10px] text-zinc-300 shadow-xl"><RefreshCw className="mr-1.5 inline h-3 w-3 animate-spin" />Working…</div>}
    </div>
  );
};
