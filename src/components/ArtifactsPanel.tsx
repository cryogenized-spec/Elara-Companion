import React, { useEffect, useMemo, useState } from 'react';
import { WorkspaceArtifact } from '../types';
import { workspaceService } from '../services/workspaceService';
import { FileText, FileType2, Grid2X2, Link2, MoreHorizontal, Search, Trash2 } from 'lucide-react';

interface ArtifactsPanelProps {
  onOpenArtifact?: (id: string) => void;
  onBack?: () => void;
}

const typeLabel = (artifact: WorkspaceArtifact) => {
  if (artifact.type === 'canvas') return 'Canvas';
  if (artifact.provider === 'google_docs') return 'Google Doc';
  if (artifact.provider === 'google_sheets') return 'Google Sheet';
  if (artifact.provider === 'google_keep') return 'Google Keep';
  if (artifact.type === 'markdown') return 'Markdown';
  return 'Document';
};

export const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({ onOpenArtifact, onBack }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'document' | 'canvas' | 'google'>('all');
  const [workspace, setWorkspace] = useState(() => workspaceService.getWorkspace());

  useEffect(() => {
    const refresh = () => setWorkspace(workspaceService.getWorkspace());
    window.addEventListener('elara:artifact-created', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('elara:artifact-created', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const artifacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspace.artifacts
      .filter((artifact) => {
        if (filter === 'canvas' && artifact.type !== 'canvas') return false;
        if (filter === 'document' && artifact.type === 'canvas') return false;
        if (filter === 'google' && !artifact.provider?.startsWith('google_')) return false;
        if (!q) return true;
        return `${artifact.name} ${artifact.type} ${artifact.provider || ''}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [workspace, query, filter]);

  const open = (id: string) => {
    const next = workspaceService.selectArtifact(id);
    setWorkspace(next);
    onOpenArtifact?.(id);
  };

  const remove = (id: string) => {
    if (!window.confirm('Delete this local artifact?')) return;
    workspaceService.removeArtifact(id);
    setWorkspace(workspaceService.getWorkspace());
  };

  return (
    <div className="fixed inset-0 z-20 flex h-[100dvh] w-full flex-col bg-[#09090b] text-zinc-100">
      <header className="flex min-h-14 items-center gap-3 border-b border-zinc-800 bg-[#0d0d0f]/95 px-3 backdrop-blur-xl">
        {onBack && <button onClick={onBack} className="h-9 w-9 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">←</button>}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Artifacts</div>
          <div className="text-[10px] text-zinc-500">Everything Elara and you have made together</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-[10px] text-zinc-500">{artifacts.length}</div>
      </header>

      <div className="border-b border-zinc-800 bg-[#0b0b0d] px-3 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search artifacts…" className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 text-xs text-zinc-200 outline-none focus:border-sky-500/50" />
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {(['all', 'document', 'canvas', 'google'] as const).map((value) => (
            <button key={value} onClick={() => setFilter(value)} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold ${filter === value ? 'bg-zinc-100 text-zinc-900' : 'border border-zinc-800 text-zinc-500 hover:text-zinc-200'}`}>
              {value === 'all' ? 'All' : value === 'document' ? 'Documents' : value === 'canvas' ? 'Canvases' : 'Google'}
            </button>
          ))}
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {artifacts.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-xs space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-600"><Grid2X2 className="h-7 w-7" /></div>
              <div className="text-sm font-medium text-zinc-300">No artifacts found</div>
              <p className="text-xs leading-5 text-zinc-600">Documents, canvases and Google-linked work created with Elara will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {artifacts.map((artifact) => (
              <article key={artifact.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-3 shadow-sm">
                <button onClick={() => open(artifact.id)} className="w-full text-left">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800">
                      {artifact.type === 'canvas' ? <Grid2X2 className="h-4 w-4 text-violet-400" /> : artifact.type === 'markdown' ? <FileType2 className="h-4 w-4 text-emerald-400" /> : <FileText className="h-4 w-4 text-sky-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-zinc-100">{artifact.name || 'Untitled Artifact'}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-600">
                        <span>{typeLabel(artifact)}</span>
                        <span>·</span>
                        <span>{new Date(artifact.updatedAt).toLocaleString()}</span>
                        {artifact.provider && <><span>·</span><span className="inline-flex items-center gap-1"><Link2 className="h-3 w-3" /> {artifact.provider.replace('google_', 'Google ')}</span></>}
                      </div>
                      {artifact.content?.trim() && <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{artifact.content.trim()}</p>}
                    </div>
                    <MoreHorizontal className="h-4 w-4 shrink-0 text-zinc-700" />
                  </div>
                </button>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-2">
                  <span className="text-[10px] text-zinc-600">{artifact.revisions?.length || 0} revisions</span>
                  <button onClick={() => remove(artifact.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-zinc-600 hover:bg-red-950/30 hover:text-red-300"><Trash2 className="h-3 w-3" /> Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};