import React, { useState } from 'react';
import {
  MemoryItem,
  MemoryScratchpadState,
  MemoryCategory,
  MemoryConfidence,
  MemoryImportance,
} from '../types';
import {
  BookOpen,
  Search,
  Plus,
  Pin,
  Trash2,
  Edit3,
  Download,
  Upload,
  Sparkles,
  Lock,
  Share2,
  X,
  Filter,
  Tag,
  Clock,
  Shield,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { runDirectMemoryMaintenance } from '../lib/geminiDirectClient';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoryState: MemoryScratchpadState;
  onSaveMemoryState: (newState: MemoryScratchpadState) => void;
  onResetMemoryState: () => void;
  onExportMemory: () => void;
  onImportMemory: (jsonStr: string) => void;
  userName: string;
  apiKey?: string;
}

const CATEGORIES: MemoryCategory[] = [
  'User',
  'Elara',
  'Relationship',
  'Home',
  'Work',
  'Projects',
  'Preferences',
  'People',
  'Places',
  'Experiences',
  'Observations',
  'Plans',
  'Other',
];

const IMPORTANCE_OPTIONS: { value: MemoryImportance; label: string; color: string }[] = [
  { value: 'core', label: 'Core Landmark', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { value: 'important', label: 'Important', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { value: 'normal', label: 'Normal', color: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  { value: 'low', label: 'Low Detail', color: 'bg-zinc-900/60 text-zinc-500 border-zinc-800' },
];

const CONFIDENCE_OPTIONS: { value: MemoryConfidence; label: string; icon: any }[] = [
  { value: 'certain', label: 'Certain', icon: CheckCircle2 },
  { value: 'likely', label: 'Likely / Inferred', icon: HelpCircle },
  { value: 'uncertain', label: 'Uncertain / Assumption', icon: AlertTriangle },
];

export const MemoryModal: React.FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  memoryState,
  onSaveMemoryState,
  onResetMemoryState,
  onExportMemory,
  onImportMemory,
  userName,
  apiKey,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'private' | 'shared'>('all');
  const [importanceFilter, setImportanceFilter] = useState<string>('all');

  // Form state for creating / editing
  const [isEditing, setIsEditing] = useState<string | null>(null); // memory id or 'new'
  const [formData, setFormData] = useState<{
    content: string;
    category: MemoryCategory;
    importance: MemoryImportance;
    confidence: MemoryConfidence;
    isPrivate: boolean;
    tags: string;
    eventDate: string;
    pinned: boolean;
  }>({
    content: '',
    category: 'Observations',
    importance: 'normal',
    confidence: 'certain',
    isPrivate: true,
    tags: '',
    eventDate: '',
    pinned: false,
  });

  const [isMaintaining, setIsMaintaining] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setFormData({
      content: '',
      category: 'Observations',
      importance: 'normal',
      confidence: 'certain',
      isPrivate: true,
      tags: '',
      eventDate: '',
      pinned: false,
    });
    setIsEditing('new');
  };

  const handleOpenEdit = (mem: MemoryItem) => {
    setFormData({
      content: mem.content,
      category: mem.category,
      importance: mem.importance,
      confidence: mem.confidence,
      isPrivate: mem.isPrivate,
      tags: mem.tags ? mem.tags.join(', ') : '',
      eventDate: mem.eventDate || '',
      pinned: mem.pinned || false,
    });
    setIsEditing(mem.id);
  };

  const handleSaveNote = () => {
    if (!formData.content.trim()) return;

    const parsedTags = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    let updatedMemories = [...memoryState.memories];

    if (isEditing === 'new') {
      const newMem: MemoryItem = {
        id: `mem_user_${Date.now()}`,
        content: formData.content.trim(),
        category: formData.category,
        importance: formData.importance,
        confidence: formData.confidence,
        isPrivate: formData.isPrivate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        eventDate: formData.eventDate || undefined,
        pinned: formData.pinned,
        tags: parsedTags,
      };
      updatedMemories.unshift(newMem);
    } else if (isEditing) {
      updatedMemories = updatedMemories.map((m) =>
        m.id === isEditing
          ? {
              ...m,
              content: formData.content.trim(),
              category: formData.category,
              importance: formData.importance,
              confidence: formData.confidence,
              isPrivate: formData.isPrivate,
              updatedAt: new Date().toISOString(),
              eventDate: formData.eventDate || undefined,
              pinned: formData.pinned,
              tags: parsedTags,
            }
          : m
      );
    }

    onSaveMemoryState({
      ...memoryState,
      memories: updatedMemories,
    });
    setIsEditing(null);
  };

  const handleDelete = (id: string) => {
    const updated = memoryState.memories.filter((m) => m.id !== id);
    onSaveMemoryState({
      ...memoryState,
      memories: updated,
    });
  };

  const handleTogglePin = (id: string) => {
    const updated = memoryState.memories.map((m) =>
      m.id === id ? { ...m, pinned: !m.pinned, updatedAt: new Date().toISOString() } : m
    );
    onSaveMemoryState({
      ...memoryState,
      memories: updated,
    });
  };

  const handleRunMaintenance = async () => {
    setIsMaintaining(true);
    setMaintenanceMessage('Elara is auditing her memory notebook...');

    try {
      let actions: any[] = [];
      let summary = '';

      if (apiKey && apiKey.trim()) {
        const res = await runDirectMemoryMaintenance(
          apiKey.trim(),
          memoryState.memories,
          userName || 'User'
        );
        actions = res.actions || [];
        summary = res.summary || '';
      } else {
        const res = await fetch('/api/memory/maintain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memories: memoryState.memories,
            userName: userName || 'User',
          }),
        });

        if (!res.ok) {
          throw new Error('Please configure your Gemini API Key in Settings to run memory optimization.');
        }

        const data = await res.json();
        actions = data.actions || [];
        summary = data.summary || '';
      }

      if (actions && actions.length > 0) {
        // Apply returned maintenance actions
        let current = [...memoryState.memories];
        for (const act of actions) {
          if (act.type === 'DELETE' && act.targetId) {
            current = current.filter((m) => m.id !== act.targetId);
          } else if (act.type === 'UPDATE' && act.targetId && act.memory) {
            current = current.map((m) =>
              m.id === act.targetId
                ? {
                    ...m,
                    content: act.memory.content || m.content,
                    confidence: act.memory.confidence || m.confidence,
                    importance: act.memory.importance || m.importance,
                    category: act.memory.category || m.category,
                    updatedAt: new Date().toISOString(),
                  }
                : m
            );
          }
        }
        onSaveMemoryState({
          ...memoryState,
          memories: current,
          lastMaintenanceAt: new Date().toISOString(),
        });
        setMaintenanceMessage(summary || 'Memory notebook audited and updated.');
      } else {
        setMaintenanceMessage('Notebook is fully optimized! No duplicate or obsolete memories found.');
      }
    } catch (err: any) {
      console.error('Maintenance error:', err);
      setMaintenanceMessage(err?.message || 'Failed to complete maintenance check.');
    } finally {
      setIsMaintaining(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        onImportMemory(content);
        setMaintenanceMessage('Memory scratchpad imported successfully.');
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Filtered Memories
  const filteredMemories = memoryState.memories.filter((mem) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const contentMatch = mem.content.toLowerCase().includes(q);
      const catMatch = mem.category.toLowerCase().includes(q);
      const tagMatch = mem.tags ? mem.tags.some((t) => t.toLowerCase().includes(q)) : false;
      if (!contentMatch && !catMatch && !tagMatch) return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && mem.category !== selectedCategory) {
      return false;
    }

    // Privacy filter
    if (privacyFilter === 'private' && !mem.isPrivate) return false;
    if (privacyFilter === 'shared' && mem.isPrivate) return false;

    // Importance filter
    if (importanceFilter !== 'all' && mem.importance !== importanceFilter) return false;

    return true;
  });

  // Sort memories: Pinned first, then Core -> Important -> Normal -> Low, then by date descending
  const sortedMemories = [...filteredMemories].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    const impRank: Record<string, number> = { core: 4, important: 3, normal: 2, low: 1 };
    const diffImp = (impRank[b.importance] || 0) - (impRank[a.importance] || 0);
    if (diffImp !== 0) return diffImp;

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const formattedUserName = userName || 'User';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
                Elara's Long-Term Memory Scratchpad
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono">
                  {memoryState.memories.length} notes
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Persistent, evolving notebook of observations, recollections, preferences, and shared landmarks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunMaintenance}
              disabled={isMaintaining}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-800/60 text-xs font-medium transition-colors disabled:opacity-50"
              title="Run AI Deduplication and Maintenance check"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isMaintaining ? 'animate-spin' : ''}`} />
              <span>{isMaintaining ? 'Auditing...' : 'Audit & Maintenance'}</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-xs transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Memory Note</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Maintenance / Notification Alert Banner */}
        {maintenanceMessage && (
          <div className="px-6 py-2.5 bg-amber-950/40 border-b border-amber-800/40 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{maintenanceMessage}</span>
            </div>
            <button
              onClick={() => setMaintenanceMessage(null)}
              className="text-amber-400 hover:text-amber-200 text-xs font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div className="p-4 bg-zinc-900/40 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Elara's memories, topics, or tags..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Cat:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Categories ({memoryState.memories.length})</option>
              {CATEGORIES.map((cat) => {
                const count = memoryState.memories.filter((m) => m.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Privacy Filter */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
            <button
              onClick={() => setPrivacyFilter('all')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                privacyFilter === 'all' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPrivacyFilter('private')}
              className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
                privacyFilter === 'private' ? 'bg-amber-500/20 text-amber-300 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Lock className="w-3 h-3 text-amber-400" /> Private
            </button>
            <button
              onClick={() => setPrivacyFilter('shared')}
              className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
                privacyFilter === 'shared' ? 'bg-sky-500/20 text-sky-300 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Share2 className="w-3 h-3 text-sky-400" /> Shared
            </button>
          </div>

          {/* Importance Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <select
              value={importanceFilter}
              onChange={(e) => setImportanceFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Importance</option>
              <option value="core">Core Landmark</option>
              <option value="important">Important</option>
              <option value="normal">Normal</option>
              <option value="low">Low Detail</option>
            </select>
          </div>
        </div>

        {/* Notebook Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-950/80">
          {sortedMemories.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 space-y-3">
              <FileText className="w-10 h-10 mx-auto text-zinc-600" />
              <p className="text-sm font-medium text-zinc-400">No memory notes match your filters.</p>
              <p className="text-xs">
                Elara will automatically add new notes as you converse, or you can manually add a memory note.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedMemories.map((mem) => {
                const parsedContent = mem.content.replace(/\[\[user\]\]/gi, formattedUserName);
                const impStyle = IMPORTANCE_OPTIONS.find((i) => i.value === mem.importance)?.color || 'bg-zinc-800 text-zinc-300';
                const ConfIcon = CONFIDENCE_OPTIONS.find((c) => c.value === mem.confidence)?.icon || CheckCircle2;

                return (
                  <div
                    key={mem.id}
                    className={`relative group rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between border ${
                      mem.pinned
                        ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-950/20'
                        : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      {/* Note Header Metadata Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Pin indicator */}
                          {mem.pinned && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-medium flex items-center gap-1">
                              <Pin className="w-2.5 h-2.5 fill-amber-300" /> Pinned
                            </span>
                          )}

                          {/* Category */}
                          <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-medium border border-zinc-700/60">
                            {mem.category}
                          </span>

                          {/* Importance */}
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${impStyle}`}>
                            {mem.importance}
                          </span>

                          {/* Privacy */}
                          {mem.isPrivate ? (
                            <span className="px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-800/40 text-[10px] font-medium flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-purple-400" /> Private Note
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-sky-950/60 text-sky-300 border border-sky-800/40 text-[10px] font-medium flex items-center gap-1">
                              <Share2 className="w-2.5 h-2.5 text-sky-400" /> Shared
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleTogglePin(mem.id)}
                            className={`p-1 rounded-lg hover:bg-zinc-800 transition-colors ${
                              mem.pinned ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                            title={mem.pinned ? 'Unpin note' : 'Pin note to top'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(mem)}
                            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                            title="Edit memory note"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(mem.id)}
                            className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Main Prose Content */}
                      <p className="text-sm text-zinc-200 leading-relaxed font-normal whitespace-pre-wrap mb-3">
                        {parsedContent}
                      </p>
                    </div>

                    {/* Card Footer Metadata */}
                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-zinc-400">
                          <ConfIcon className="w-3 h-3 text-amber-400/80" />
                          {mem.confidence}
                        </span>
                        {mem.eventDate && (
                          <span className="text-zinc-500">Event: {mem.eventDate}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(mem.updatedAt || mem.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={onExportMemory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Memory</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors font-medium cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Memory</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset Elara’s memory scratchpad to defaults?')) {
                  onResetMemoryState();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-colors font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Scratchpad</span>
            </button>
          </div>

          <div className="text-zinc-500 text-[11px]">
            Memories automatically persist across sessions and refine Elara's long-term familiarity.
          </div>
        </div>

        {/* Create / Edit Memory Note Modal Overlay */}
        {isEditing && (
          <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  {isEditing === 'new' ? 'New Long-Term Memory Note' : 'Edit Memory Note'}
                </h3>
                <button
                  onClick={() => setIsEditing(null)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Prose Content Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Memory Prose Note (Use [[user]] for user name)
                </label>
                <textarea
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="e.g. [[user]] prefers dry humour and always reaches for the blue mug in the morning..."
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Category & Importance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as MemoryCategory })}
                    className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Importance
                  </label>
                  <select
                    value={formData.importance}
                    onChange={(e) => setFormData({ ...formData, importance: e.target.value as MemoryImportance })}
                    className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="core">Core Landmark</option>
                    <option value="important">Important</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low Detail</option>
                  </select>
                </div>
              </div>

              {/* Confidence & Privacy */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Confidence
                  </label>
                  <select
                    value={formData.confidence}
                    onChange={(e) => setFormData({ ...formData, confidence: e.target.value as MemoryConfidence })}
                    className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="certain">Certain (Stated Fact)</option>
                    <option value="likely">Likely (Inferred / Pattern)</option>
                    <option value="uncertain">Uncertain (Assumption)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Visibility
                  </label>
                  <select
                    value={formData.isPrivate ? 'private' : 'shared'}
                    onChange={(e) => setFormData({ ...formData, isPrivate: e.target.value === 'private' })}
                    className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="private">Private Elara Note</option>
                    <option value="shared">Shared Experience Note</option>
                  </select>
                </div>
              </div>

              {/* Tags & Event Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g. workshop, coffee, habit"
                    className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Event Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Pin Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinNote"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="rounded bg-zinc-950 border-zinc-800 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="pinNote" className="text-xs text-zinc-300 font-medium">
                  Pin this note to the top of Elara's notebook
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => setIsEditing(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-medium"
                >
                  Save Memory Note
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
