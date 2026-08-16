import React, { useState, useEffect, useRef } from 'react';
import { Workspace, WorkspaceArtifact } from '../types';
import { getWorkspace, saveWorkspace, createArtifact, updateArtifact, deleteArtifact, setActiveArtifact } from '../lib/workspaceStorage';
import { Plus, FileText, Trash2, Edit2, X, Check, Eye, Code, ChevronDown, FileType2, ArrowLeft, Menu } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface WorkspaceViewProps {
  activeArtifactId?: string | null;
  onSelectArtifact?: (id: string) => void;
  onBackToChat?: () => void;
  onOpenSidebar?: () => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  activeArtifactId: propActiveArtifactId,
  onSelectArtifact,
  onBackToChat,
  onOpenSidebar,
}) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);

  // Local state for fast typing without re-rendering the whole workspace object
  const [localContent, setLocalContent] = useState<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localContentRef = useRef(localContent);
  localContentRef.current = localContent;
  const activeArtifactRef = useRef<WorkspaceArtifact | null>(null);

  // Load and synchronize workspace
  useEffect(() => {
    const ws = getWorkspace();
    let targetId = propActiveArtifactId || ws.activeArtifactId;

    if (propActiveArtifactId && ws.artifacts.some((a) => a.id === propActiveArtifactId)) {
      ws.activeArtifactId = propActiveArtifactId;
      saveWorkspace(ws);
      targetId = propActiveArtifactId;
    }

    setWorkspace(ws);

    if (targetId) {
      const active = ws.artifacts.find((a) => a.id === targetId);
      if (active) {
        setLocalContent(active.content);
        activeArtifactRef.current = active;
      }
    }
  }, [propActiveArtifactId]);

  // Flush any pending unsaved changes on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (activeArtifactRef.current && localContentRef.current !== activeArtifactRef.current.content) {
        const ws = getWorkspace();
        updateArtifact(ws, activeArtifactRef.current.id, { content: localContentRef.current });
      }
    };
  }, []);

  if (!workspace) return null;

  const activeArtifact = workspace.artifacts.find((a) => a.id === workspace.activeArtifactId) || null;
  activeArtifactRef.current = activeArtifact;

  const handleCreate = (type: 'text' | 'markdown' = 'text') => {
    // Flush current active if needed
    if (activeArtifact && localContent !== activeArtifact.content) {
      updateArtifact(workspace, activeArtifact.id, { content: localContent });
    }

    const updated = createArtifact(workspace, type === 'markdown' ? 'Untitled.md' : 'Untitled', type);
    setWorkspace(updated);
    setLocalContent('');
    setShowNewMenu(false);
    setPreviewMode(false);
    if (onSelectArtifact && updated.activeArtifactId) {
      onSelectArtifact(updated.activeArtifactId);
    }
  };

  const handleSelect = (id: string) => {
    // Flush current before switching
    let currentWs = workspace;
    if (activeArtifact && localContent !== activeArtifact.content) {
      currentWs = updateArtifact(workspace, activeArtifact.id, { content: localContent });
    }

    const updated = setActiveArtifact(id);
    setWorkspace(updated);

    const newlyActive = updated.artifacts.find((a) => a.id === id);
    setLocalContent(newlyActive?.content || '');
    setEditingId(null);
    setDeleteConfirmId(null);

    if (onSelectArtifact) {
      onSelectArtifact(id);
    }
  };

  const handleDelete = (id: string) => {
    let becameEmpty = false;
    let newActiveContent = '';

    const updated = deleteArtifact(workspace, id);
    if (id === workspace.activeArtifactId) {
      becameEmpty = true;
      const newActive = updated.artifacts.find((a) => a.id === updated.activeArtifactId);
      newActiveContent = newActive?.content || '';
      if (onSelectArtifact) {
        onSelectArtifact(updated.activeArtifactId || '');
      }
    }
    setWorkspace(updated);

    if (becameEmpty) {
      setLocalContent(newActiveContent);
    }
    setDeleteConfirmId(null);
  };

  const handleRenameSubmit = (id: string) => {
    if (editName.trim()) {
      const updated = updateArtifact(workspace, id, { name: editName.trim() });
      setWorkspace(updated);
    }
    setEditingId(null);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);

    if (activeArtifact) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setWorkspace((prev) => {
          if (!prev) return prev;
          return updateArtifact(prev, activeArtifact.id, { content: newContent });
        });
      }, 400);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] text-zinc-200">
      {/* Left Sidebar (Artifacts) */}
      <div className="w-64 border-r border-zinc-800 flex flex-col bg-[#121212] shrink-0">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">{workspace.name}</h2>
          <div className="relative">
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 hover:border-zinc-500 text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
              title="New Artifact"
            >
              <Plus className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showNewMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNewMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => handleCreate('markdown')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-emerald-600/20 hover:text-emerald-400 transition-colors text-left"
                  >
                    <FileType2 className="w-4 h-4" />
                    Markdown
                  </button>
                  <button
                    onClick={() => handleCreate('text')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:bg-sky-600/20 hover:text-sky-400 transition-colors text-left"
                  >
                    <FileText className="w-4 h-4" />
                    Plain Text
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {workspace.artifacts.length === 0 && (
            <div className="text-xs text-zinc-500 text-center mt-4">No artifacts yet.</div>
          )}
          {workspace.artifacts.map((artifact) => (
            <div
              key={artifact.id}
              onClick={() => handleSelect(artifact.id)}
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                workspace.activeArtifactId === artifact.id
                  ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/60 font-medium shadow-sm'
                  : 'bg-zinc-900/30 border border-zinc-800/40 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                {artifact.type === 'markdown' ? (
                  <FileType2 className={`w-3.5 h-3.5 shrink-0 ${workspace.activeArtifactId === artifact.id ? 'text-emerald-400' : 'text-zinc-500'}`} />
                ) : (
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${workspace.activeArtifactId === artifact.id ? 'text-emerald-400' : 'text-zinc-500'}`} />
                )}
                {editingId === artifact.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRenameSubmit(artifact.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit(artifact.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 bg-zinc-950 border border-emerald-500/50 rounded px-1.5 py-0.5 text-zinc-100 outline-none"
                  />
                ) : (
                  <span className="truncate">{artifact.name}</span>
                )}
              </div>
              
              <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${deleteConfirmId === artifact.id ? 'opacity-100' : ''}`}>
                {deleteConfirmId === artifact.id ? (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(artifact.id); }} className="p-1 hover:text-red-400 transition-colors" title="Confirm Delete">
                      <Check className="w-3.5 h-3.5 text-red-500" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="p-1 hover:text-zinc-300 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(artifact.id);
                        setEditName(artifact.name);
                      }}
                      className="p-1 text-zinc-500 hover:text-emerald-400 transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(artifact.id);
                      }}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
        {activeArtifact ? (
          <>
            <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-[#0a0a0a]/80 backdrop-blur-md gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {onOpenSidebar && (
                  <button
                    onClick={onOpenSidebar}
                    className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
                    title="Open Navigation"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                )}
                {onBackToChat && (
                  <button
                    onClick={onBackToChat}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-800 transition-colors shrink-0 mr-1"
                    title="Return to Chat Conversation"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">Return to Chat</span>
                    <span className="sm:hidden">Chat</span>
                  </button>
                )}
                <div className="p-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 shrink-0">
                  {activeArtifact.type === 'markdown' ? <FileType2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight truncate">{activeArtifact.name}</h2>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                {activeArtifact.type === 'markdown' && (
                  <div className="flex items-center bg-zinc-900/50 rounded-lg p-0.5 border border-zinc-800">
                    <button
                      onClick={() => setPreviewMode(false)}
                      className={`px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${!previewMode ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setPreviewMode(true)}
                      className={`px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${previewMode ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[10px] font-mono border-l border-zinc-800 pl-3 sm:pl-4">
                  <span className="text-zinc-500 px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900/50 hidden sm:inline-block">
                    {localContent.trim() ? localContent.trim().split(/\s+/).length : 0} words
                  </span>
                  <span className="text-zinc-500">
                    Updated: {new Date(activeArtifact.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-6 md:p-8 lg:px-12 xl:px-24 overflow-y-auto custom-scrollbar">
              {previewMode && activeArtifact.type === 'markdown' ? (
                <MarkdownRenderer content={localContent} />
              ) : (
                <textarea
                  value={localContent}
                  onChange={handleContentChange}
                  placeholder="Start typing..."
                  className="w-full h-full bg-transparent text-zinc-300 text-sm resize-none outline-none custom-scrollbar leading-relaxed font-mono"
                  spellCheck="false"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4 p-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center text-zinc-600 shadow-inner">
              <FileText className="w-8 h-8" />
            </div>
            <div className="text-sm">Select or create an artifact to begin</div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleCreate('markdown')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                Create New Artifact
              </button>
              {onBackToChat && (
                <button
                  onClick={onBackToChat}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-800 transition-colors"
                >
                  Return to Chat
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
