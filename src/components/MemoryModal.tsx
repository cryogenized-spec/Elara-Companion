import React, { useMemo, useState } from 'react';
import {
  MemoryCategory,
  MemoryConfidence,
  MemoryImportance,
  MemoryItem,
  MemoryKind,
  MemoryLifecycle,
  MemoryScratchpadState,
  MemorySource,
} from '../types';
import {
  ArrowLeft,
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
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Archive,
  Link as LinkIcon,
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

const CATEGORIES: MemoryCategory[] = ['User', 'Elara', 'Relationship', 'Home', 'Work', 'Projects', 'Preferences', 'People', 'Places', 'Experiences', 'Observations', 'Plans', 'Other'];
const KINDS: MemoryKind[] = ['fact', 'preference', 'observation', 'episode', 'project', 'relationship', 'plan', 'working', 'context'];
const LIFECYCLES: MemoryLifecycle[] = ['working', 'contextual', 'persistent', 'core', 'archived'];
const SOURCES: MemorySource[] = ['user', 'elara', 'conversation', 'artifact', 'system', 'imported'];

const CONFIDENCE_ICON: Record<MemoryConfidence, React.ComponentType<{ className?: string }>> = {
  certain: CheckCircle2,
  likely: HelpCircle,
  uncertain: AlertTriangle,
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
  onResetMemoryState,
  onExportMemory,
  onImportMemory,
  userName,
  apiKey,
}) => {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | MemoryKind>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<'all' | MemoryLifecycle>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | MemoryCategory>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [maintaining, setMaintaining] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<MemoryItem>>({
    content: '', kind: 'observation', lifecycle: 'persistent', source: 'user', category: 'Observations', confidence: 'certain', importance: 'normal', isPrivate: true, tags: [], pinned: false,
  });

  if (!isOpen) return null;

  const memories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...memoryState.memories]
      .filter((m) => showArchived || m.lifecycle !== 'archived')
      .filter((m) => kindFilter === 'all' || m.kind === kindFilter)
      .filter((m) => lifecycleFilter === 'all' || m.lifecycle === lifecycleFilter)
      .filter((m) => categoryFilter === 'all' || m.category === categoryFilter)
      .filter((m) => {
        if (!q) return true;
        return [m.content, m.category, m.kind, m.lifecycle, ...(m.tags || [])].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [memoryState.memories, query, kindFilter, lifecycleFilter, categoryFilter, showArchived]);

  const openNew = () => {
    const now = new Date().toISOString();
    setEditingId('new');
    setForm({ id: `mem_user_${Date.now()}`, content: '', kind: 'observation', lifecycle: 'persistent', source: 'user', category: 'Observations', confidence: 'certain', importance: 'normal', isPrivate: true, createdAt: now, updatedAt: now, tags: [], pinned: false });
  };

  const openEdit = (memory: MemoryItem) => {
    setEditingId(memory.id);
    setForm({ ...memory, tags: [...(memory.tags || [])], links: [...(memory.links || [])] });
  };

  const saveForm = () => {
    const content = String(form.content || '').trim();
    if (!content) return;
    const now = new Date().toISOString();
    const existing = memoryState.memories.find((m) => m.id === editingId);
    const next: MemoryItem = {
      id: existing?.id || String(form.id || `mem_user_${Date.now()}`),
      content,
      kind: (form.kind || existing?.kind || 'observation') as MemoryKind,
      lifecycle: (form.lifecycle || existing?.lifecycle || 'persistent') as MemoryLifecycle,
      source: (form.source || existing?.source || 'user') as MemorySource,
      confidence: (form.confidence || existing?.confidence || 'certain') as MemoryConfidence,
      importance: (form.importance || existing?.importance || 'normal') as MemoryImportance,
      isPrivate: form.isPrivate ?? existing?.isPrivate ?? true,
      category: (form.category || existing?.category || 'Observations') as MemoryCategory,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      eventDate: form.eventDate || existing?.eventDate,
      expiresAt: form.expiresAt || existing?.expiresAt,
      lastRecalledAt: existing?.lastRecalledAt,
      reinforcementCount: existing?.reinforcementCount || 0,
      pinned: Boolean(form.pinned ?? existing?.pinned),
      tags: form.tags || existing?.tags || [],
      sourceConversationId: form.sourceConversationId || existing?.sourceConversationId,
      sourceArtifactId: form.sourceArtifactId || existing?.sourceArtifactId,
      relatedMemoryIds: form.relatedMemoryIds || existing?.relatedMemoryIds,
      links: form.links || existing?.links,
    };
    const memoriesNext = existing ? memoryState.memories.map((m) => m.id === existing.id ? next : m) : [next, ...memoryState.memories];
    onSaveMemoryState({ ...memoryState, memories: memoriesNext });
    setEditingId(null);
  };

  const deleteMemory = (id: string) => onSaveMemoryState({ ...memoryState, memories: memoryState.memories.filter((m) => m.id !== id) });
  const togglePin = (id: string) => onSaveMemoryState({ ...memoryState, memories: memoryState.memories.map((m) => m.id === id ? { ...m, pinned: !m.pinned, updatedAt: new Date().toISOString() } : m) });

  const runMaintenance = async () => {
    setMaintaining(true);
    setNotice('Elara is auditing her memory notebook...');
    try {
      let response: any;
      if (apiKey?.trim()) {
        response = await runDirectMemoryMaintenance(apiKey.trim(), memoryState.memories, userName || 'User');
      } else {
        const res = await fetch('/api/memory/maintain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memories: memoryState.memories, userName: userName || 'User' }) });
        if (!res.ok) throw new Error('Configure a Gemini API key to run memory maintenance.');
        response = await res.json();
      }
      let next = [...memoryState.memories];
      for (const action of response?.actions || []) {
        if (action.type === 'DELETE' && action.targetId) next = next.filter((m) => m.id !== action.targetId);
        if ((action.type === 'UPDATE' || action.type === 'CREATE' || action.type === 'ADD') && action.targetId && action.memory) {
          next = next.map((m) => m.id === action.targetId ? { ...m, ...action.memory, updatedAt: new Date().toISOString() } : m);
        }
      }
      onSaveMemoryState({ ...memoryState, memories: next, lastMaintenanceAt: new Date().toISOString() });
      setNotice(response?.summary || 'Memory audit complete.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Memory audit failed.');
    } finally {
      setMaintaining(false);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { onImportMemory(String(reader.result || '')); setNotice('Memory imported.'); }
      catch { setNotice('That file is not valid memory JSON.'); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-4">
      <div className="flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
        <header className="shrink-0 border-b border-zinc-800 bg-zinc-900/80 px-3 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 sm:hidden" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300"><BookOpen className="h-5 w-5" /></div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold sm:text-lg">Elara's Memory</h2>
                <p className="text-[11px] text-zinc-500">{memoryState.memories.length} stored memories · automatic notes stay here</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={runMaintenance} disabled={maintaining} className="rounded-xl p-2 text-violet-300 hover:bg-violet-950/50 disabled:opacity-50" title="Audit memory"><Sparkles className={`h-4 w-4 ${maintaining ? 'animate-spin' : ''}`} /></button>
              <button onClick={openNew} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400"><Plus className="mr-1 inline h-3.5 w-3.5" />Note</button>
              <button onClick={onClose} className="hidden rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 sm:block" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
          </div>
          {notice && <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200"><span>{notice}</span><button onClick={() => setNotice(null)} className="text-amber-400">Dismiss</button></div>}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search what Elara remembers..." className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 text-xs outline-none focus:border-amber-500/60" /></label>
            <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as any)} className="h-9 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs"><option value="all">All kinds</option>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
            <select value={lifecycleFilter} onChange={(e) => setLifecycleFilter(e.target.value as any)} className="h-9 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs"><option value="all">All lifecycles</option>{LIFECYCLES.map((k) => <option key={k} value={k}>{LIFE_LABEL[k]}</option>)}</select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as any)} className="h-9 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs"><option value="all">All categories</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-600"><button onClick={() => setShowArchived((v) => !v)} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-zinc-800 hover:text-zinc-300"><Archive className="h-3 w-3" /> {showArchived ? 'Hide archived' : 'Show archived'}</button><span>{memories.length} matching</span></div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {memories.length === 0 ? (
            <div className="flex min-h-full items-center justify-center p-6 text-center"><div><BookOpen className="mx-auto mb-3 h-10 w-10 text-zinc-700" /><p className="text-sm text-zinc-400">Nothing matches this view.</p><p className="mt-1 text-[11px] text-zinc-600">Elara will add useful memories automatically as conversations develop.</p></div></div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {memories.map((memory) => {
                const ConfidenceIcon = CONFIDENCE_ICON[memory.confidence];
                return (
                  <article key={memory.id} className={`rounded-2xl border p-4 transition ${memory.pinned ? 'border-amber-500/35 bg-amber-500/[0.04]' : 'border-zinc-800 bg-zinc-900/45 hover:border-zinc-700'}`}>
                    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 flex-wrap gap-1.5">
                      {memory.pinned && <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300"><Pin className="mr-1 inline h-2.5 w-2.5" />Pinned</span>}
                      <span className="rounded-md border border-sky-500/20 bg-sky-500/5 px-2 py-0.5 text-[10px] text-sky-300">{KIND_LABEL[memory.kind || 'observation']}</span>
                      <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300">{LIFE_LABEL[memory.lifecycle || 'persistent']}</span>
                      <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-500">{memory.category}</span>
                    </div><div className="flex shrink-0 items-center gap-1"><button onClick={() => togglePin(memory.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-amber-300" title="Pin"><Pin className="h-3.5 w-3.5" /></button><button onClick={() => openEdit(memory)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100" title="Edit"><Edit3 className="h-3.5 w-3.5" /></button><button onClick={() => deleteMemory(memory.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button></div></div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{memory.content.replace(/\[\[user\]\]/gi, userName || 'User')}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500"><span className="inline-flex items-center gap-1"><ConfidenceIcon className="h-3 w-3 text-amber-400" />{memory.confidence}</span><span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5">{memory.importance}</span><span>{memory.isPrivate ? <><Lock className="mr-1 inline h-3 w-3" />Private</> : <><Share2 className="mr-1 inline h-3 w-3" />Shared</>}</span><span>source: {memory.source || 'conversation'}</span>{typeof memory.reinforcementCount === 'number' && memory.reinforcementCount > 0 && <span>reinforced {memory.reinforcementCount}×</span>}</div>
                    {(memory.tags?.length || memory.links?.length || memory.sourceConversationId || memory.sourceArtifactId) ? <div className="mt-3 border-t border-zinc-800/70 pt-3">{memory.tags?.length ? <div className="mb-2 flex flex-wrap gap-1.5">{memory.tags.map((tag) => <span key={tag} className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">#{tag}</span>)}</div> : null}<div className="flex flex-wrap gap-2 text-[10px] text-zinc-500">{(memory.sourceConversationId || memory.links?.some((l) => l.type === 'conversation')) && <span className="inline-flex items-center gap-1"><LinkIcon className="h-3 w-3" /> conversation linked</span>}{(memory.sourceArtifactId || memory.links?.some((l) => l.type === 'artifact')) && <span className="inline-flex items-center gap-1"><LinkIcon className="h-3 w-3" /> artifact linked</span>}{memory.links?.filter((l) => l.type === 'memory').length ? <span>{memory.links.filter((l) => l.type === 'memory').length} related memories</span> : null}</div></div> : null}
                    <footer className="mt-3 flex items-center justify-between border-t border-zinc-800/70 pt-2 text-[10px] text-zinc-600"><span>{new Date(memory.updatedAt || memory.createdAt).toLocaleDateString()}</span><span>{memory.expiresAt ? `expires ${new Date(memory.expiresAt).toLocaleDateString()}` : memory.eventDate ? `event ${memory.eventDate}` : 'persistent context'}</span></footer>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        <footer className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-900/80 px-3 py-2.5 sm:px-5"><div className="flex items-center gap-1.5"><button onClick={onExportMemory} className="rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><Download className="mr-1 inline h-3 w-3" />Export</button><label className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><Upload className="mr-1 inline h-3 w-3" />Import<input type="file" accept=".json" onChange={handleImport} className="hidden" /></label><button onClick={() => { if (window.confirm('Reset Elara memory to defaults?')) onResetMemoryState(); }} className="rounded-lg px-2.5 py-1.5 text-[10px] text-rose-400 hover:bg-rose-950/40"><RotateCcw className="mr-1 inline h-3 w-3" />Reset</button></div><span className="text-[10px] text-zinc-600">Memory is persistent across sessions.</span></footer>

        {editingId && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5"><div className="max-h-[90%] w-full max-w-xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl sm:p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">{editingId === 'new' ? 'New memory' : 'Edit memory'}</h3><p className="mt-0.5 text-[10px] text-zinc-500">The note stays natural-language; metadata controls how Elara uses it.</p></div><button onClick={() => setEditingId(null)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"><X className="h-4 w-4" /></button></div><textarea value={String(form.content || '')} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} placeholder="Write the memory as a natural note..." className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm outline-none focus:border-amber-500/60" /><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"><select value={String(form.kind || 'observation')} onChange={(e) => setForm({ ...form, kind: e.target.value as MemoryKind })} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs">{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select><select value={String(form.lifecycle || 'persistent')} onChange={(e) => setForm({ ...form, lifecycle: e.target.value as MemoryLifecycle })} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs">{LIFECYCLES.map((k) => <option key={k} value={k}>{LIFE_LABEL[k]}</option>)}</select><select value={String(form.source || 'user')} onChange={(e) => setForm({ ...form, source: e.target.value as MemorySource })} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs">{SOURCES.map((k) => <option key={k} value={k}>{k}</option>)}</select><select value={String(form.category || 'Observations')} onChange={(e) => setForm({ ...form, category: e.target.value as MemoryCategory })} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs">{CATEGORIES.map((k) => <option key={k} value={k}>{k}</option>)}</select><select value={String(form.importance || 'normal')} onChange={(e) => setForm({ ...form, importance: e.target.value as MemoryImportance })} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs"><option value="low">Low</option><option value="normal">Normal</option><option value="important">Important</option><option value="core">Core</option></select><select value={String(form.confidence || 'certain')} onChange={(e) => setForm({ ...form, confidence: e.target.value as MemoryConfidence })} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs"><option value="certain">Certain</option><option value="likely">Likely</option><option value="uncertain">Uncertain</option></select></div><div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={Boolean(form.isPrivate)} onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })} />Private</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={Boolean(form.pinned)} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />Pinned</label></div><input value={(form.tags || []).join(', ')} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="tags, comma separated" className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs outline-none focus:border-amber-500/60" /><div className="mt-4 flex justify-end gap-2 border-t border-zinc-800 pt-3"><button onClick={() => setEditingId(null)} className="rounded-xl bg-zinc-800 px-3 py-2 text-xs text-zinc-300">Cancel</button><button onClick={saveForm} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-zinc-950">Save memory</button></div></div></div>}
      </div>
    </div>
  );
};
