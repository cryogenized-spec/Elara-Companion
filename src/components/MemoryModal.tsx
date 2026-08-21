import React from 'react';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  HelpCircle,
  Lock,
  Pin,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { MemoryConfidence, MemoryItem, MemoryKind, MemoryLifecycle, MemoryScratchpadState } from '../types';
import { MemoryTransparencySettingsPanel } from './MemoryTransparencySettingsPanel';

export interface MemoryModalProps {
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

type Tab = 'scratchpad' | 'insights';

const KINDS: MemoryKind[] = ['fact', 'preference', 'observation', 'episode', 'project', 'relationship', 'plan', 'working', 'context'];
const LIFECYCLES: MemoryLifecycle[] = ['working', 'contextual', 'persistent', 'core', 'archived'];

const CONFIDENCE_ICON: Record<MemoryConfidence, React.ComponentType<{ className?: string }>> = {
  certain: CheckCircle2,
  likely: HelpCircle,
  uncertain: HelpCircle,
};

const KIND_LABEL: Record<MemoryKind, string> = {
  fact: 'Fact', preference: 'Preference', observation: 'Observation', episode: 'Episode', project: 'Project', relationship: 'Relationship', plan: 'Plan', working: 'Working', context: 'Context',
};

const LIFE_LABEL: Record<MemoryLifecycle, string> = {
  working: 'Working', contextual: 'Contextual', persistent: 'Persistent', core: 'Core', archived: 'Archived',
};

export const MemoryModal: React.FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  memoryState,
  onSaveMemoryState,
  onExportMemory,
  onImportMemory,
  userName,
}) => {
  const [tab, setTab] = React.useState<Tab>('scratchpad');
  const [query, setQuery] = React.useState('');
  const [kindFilter, setKindFilter] = React.useState<'all' | MemoryKind>('all');
  const [lifecycleFilter, setLifecycleFilter] = React.useState<'all' | MemoryLifecycle>('all');
  const [showArchived, setShowArchived] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const memories = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(memoryState?.memories || [])]
      .filter((memory) => showArchived || memory.lifecycle !== 'archived')
      .filter((memory) => kindFilter === 'all' || memory.kind === kindFilter)
      .filter((memory) => lifecycleFilter === 'all' || memory.lifecycle === lifecycleFilter)
      .filter((memory) => !q || [
        memory.content,
        memory.category,
        memory.kind,
        memory.lifecycle,
        memory.resolution,
        ...(memory.tags || []),
      ].some((value) => String(value || '').toLowerCase().includes(q)))
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [memoryState?.memories, query, kindFilter, lifecycleFilter, showArchived]);

  const togglePin = (id: string) => {
    onSaveMemoryState({
      ...memoryState,
      memories: memoryState.memories.map((memory) => memory.id === id
        ? { ...memory, pinned: !memory.pinned, updatedAt: new Date().toISOString() }
        : memory),
    });
  };

  const deleteMemory = (id: string) => {
    onSaveMemoryState({
      ...memoryState,
      memories: memoryState.memories.filter((memory) => memory.id !== id),
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImportMemory(String(reader.result || ''));
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExport = () => onExportMemory();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-4">
      <div className="flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
        <header className="shrink-0 border-b border-zinc-800 bg-zinc-900/90 px-3 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 sm:hidden" aria-label="Back">
                <BookOpen className="h-5 w-5" />
              </button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold sm:text-lg">Elara's Memory Scratchpad</h2>
                <p className="text-[11px] text-zinc-500">{memoryState.memories.length} stored memories · observations, context and insights</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="hidden rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 sm:block" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 inline-flex w-full rounded-xl border border-zinc-800 bg-zinc-950/70 p-1 sm:w-auto">
            <button
              type="button"
              onClick={() => setTab('scratchpad')}
              aria-selected={tab === 'scratchpad'}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition sm:flex-none ${tab === 'scratchpad' ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/20' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Scratchpad
            </button>
            <button
              type="button"
              onClick={() => setTab('insights')}
              aria-selected={tab === 'insights'}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition sm:flex-none ${tab === 'insights' ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/20' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Insights
            </button>
          </div>

          {tab === 'scratchpad' && (
            <>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                <label className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search what Elara remembers..." className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 text-xs outline-none focus:border-amber-500/60" />
                </label>
                <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as 'all' | MemoryKind)} className="h-9 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs">
                  <option value="all">All kinds</option>
                  {KINDS.map((kind) => <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>)}
                </select>
                <select value={lifecycleFilter} onChange={(event) => setLifecycleFilter(event.target.value as 'all' | MemoryLifecycle)} className="h-9 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs">
                  <option value="all">All lifecycles</option>
                  {LIFECYCLES.map((lifecycle) => <option key={lifecycle} value={lifecycle}>{LIFE_LABEL[lifecycle]}</option>)}
                </select>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-600">
                <button type="button" onClick={() => setShowArchived((value) => !value)} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-zinc-800 hover:text-zinc-300">
                  <Archive className="h-3 w-3" /> {showArchived ? 'Hide archived' : 'Show archived'}
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleExport} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-zinc-800 hover:text-zinc-300"><Download className="h-3 w-3" /> Export</button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-zinc-800 hover:text-zinc-300"><Upload className="h-3 w-3" /> Import</button>
                  <span>{memories.length} matching</span>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
            </>
          )}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {tab === 'insights' ? (
            <MemoryTransparencySettingsPanel />
          ) : memories.length === 0 ? (
            <div className="flex min-h-full items-center justify-center p-6 text-center">
              <div>
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
                <p className="text-sm text-zinc-400">Nothing matches this view.</p>
                <p className="mt-1 text-[11px] text-zinc-600">Elara will add useful memories automatically as conversations develop.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {memories.map((memory) => {
                const ConfidenceIcon = CONFIDENCE_ICON[memory.confidence];
                return (
                  <article key={memory.id} className={`rounded-2xl border p-4 transition ${memory.pinned ? 'border-amber-500/35 bg-amber-500/[0.04]' : 'border-zinc-800 bg-zinc-900/45 hover:border-zinc-700'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap gap-1.5">
                        {memory.pinned && <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300"><Pin className="mr-1 inline h-2.5 w-2.5" />Pinned</span>}
                        <span className="rounded-md border border-sky-500/20 bg-sky-500/5 px-2 py-0.5 text-[10px] text-sky-300">{KIND_LABEL[memory.kind || 'observation']}</span>
                        <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300">{LIFE_LABEL[memory.lifecycle || 'persistent']}</span>
                        {memory.category && <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-500">{memory.category}</span>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => togglePin(memory.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-amber-300" title="Pin"><Pin className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => togglePin(memory.id)} className="hidden" aria-label="Edit legacy memory" title="Edit legacy memory"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => deleteMemory(memory.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400" title="Delete memory"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{memory.content.replace(/\[\[user\]\]/gi, userName || 'User')}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                      <span className="inline-flex items-center gap-1"><ConfidenceIcon className="h-3 w-3 text-amber-400" />{memory.confidence}</span>
                      <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5">{memory.importance}</span>
                      <span>{memory.isPrivate ? <><Lock className="mr-1 inline h-3 w-3" />Private</> : <><Share2 className="mr-1 inline h-3 w-3" />Shared</>}</span>
                      <span>source: {memory.source || 'conversation'}</span>
                      {typeof memory.reinforcementCount === 'number' && memory.reinforcementCount > 0 && <span>reinforced {memory.reinforcementCount}×</span>}
                    </div>
                    {memory.tags?.length ? <div className="mt-3 border-t border-zinc-800/70 pt-3 flex flex-wrap gap-1.5">{memory.tags.map((tag) => <span key={tag} className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">#{tag}</span>)}</div> : null}
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
