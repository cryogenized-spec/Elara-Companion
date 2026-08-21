import React from 'react';
import { AlertTriangle, Archive, CheckCircle2, Clock3, FileText, GitBranch, Link2, MessageSquare, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { MemoryItem, MemoryState } from '../types';

interface MemoryTransparencyPanelProps {
  memory: MemoryItem;
  memories: MemoryItem[];
  onClose: () => void;
}

const STATE_LABEL: Record<MemoryState, string> = {
  active: 'Active',
  stale: 'Stale',
  archived: 'Archived',
  superseded: 'Superseded',
  conflicted: 'Conflicted',
};

const STATE_CLASS: Record<MemoryState, string> = {
  active: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
  stale: 'border-amber-500/20 bg-amber-500/5 text-amber-300',
  archived: 'border-zinc-700 bg-zinc-900 text-zinc-400',
  superseded: 'border-violet-500/20 bg-violet-500/5 text-violet-300',
  conflicted: 'border-rose-500/20 bg-rose-500/5 text-rose-300',
};

function formatDate(value?: string): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function resolutionLabel(memory: MemoryItem): string {
  return memory.resolution || (memory.lifecycle === 'core' ? 'core' : memory.kind === 'observation' ? 'observation' : 'contextual');
}

function relatedMemories(memory: MemoryItem, memories: MemoryItem[]): MemoryItem[] {
  const ids = new Set([...(memory.relatedMemoryIds || []), ...(memory.links || []).filter((link) => link.type === 'memory').map((link) => link.id)]);
  return memories.filter((candidate) => ids.has(candidate.id));
}

export const MemoryTransparencyPanel: React.FC<MemoryTransparencyPanelProps> = ({ memory, memories, onClose }) => {
  const state: MemoryState = memory.state || 'active';
  const related = relatedMemories(memory, memories);
  const evidenceIds = memory.evidenceMemoryIds || [];
  const evidenceCount = Math.max(memory.evidenceCount || 0, evidenceIds.length);
  const conflictIds = memory.conflictMemoryIds || [];

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-5">
      <section className="flex max-h-[88%] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl" aria-label="Memory transparency details">
        <header className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100"><Search className="h-4 w-4 text-amber-300" /> Why Elara remembers this</div>
            <p className="mt-1 truncate text-[10px] text-zinc-500">Inspect provenance, confidence, evidence and lifecycle without changing the memory.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100" aria-label="Close transparency"><X className="h-4 w-4" /></button>
        </header>

        <main className="min-h-0 overflow-y-auto p-4 sm:p-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{memory.content}</p></div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"><span className="text-[10px] text-zinc-500">Resolution</span><p className="mt-1 text-xs font-medium text-zinc-200">{resolutionLabel(memory)}</p></div>
            <div className="rounded-xl border px-3 py-3 ${STATE_CLASS[state] || STATE_CLASS.active}"><span className="text-[10px] opacity-70">State</span><p className="mt-1 text-xs font-medium">{STATE_LABEL[state]}</p></div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"><span className="text-[10px] text-zinc-500">Confidence</span><p className="mt-1 text-xs font-medium text-zinc-200">{memory.confidence}</p></div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"><span className="text-[10px] text-zinc-500">Importance</span><p className="mt-1 text-xs font-medium text-zinc-200">{memory.importance}</p></div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/35 p-4">
              <h4 className="flex items-center gap-2 text-xs font-semibold text-zinc-200"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Provenance</h4>
              <dl className="mt-3 space-y-2 text-[11px]">
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Source</dt><dd className="text-right text-zinc-300">{memory.source || 'conversation'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Category</dt><dd className="text-right text-zinc-300">{memory.category}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Created</dt><dd className="text-right text-zinc-300">{formatDate(memory.createdAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Updated</dt><dd className="text-right text-zinc-300">{formatDate(memory.updatedAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Last observed</dt><dd className="text-right text-zinc-300">{formatDate(memory.lastObservedAt)}</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/35 p-4">
              <h4 className="flex items-center gap-2 text-xs font-semibold text-zinc-200"><GitBranch className="h-3.5 w-3.5 text-violet-300" /> Evidence & reinforcement</h4>
              <dl className="mt-3 space-y-2 text-[11px]">
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Evidence count</dt><dd className="text-right text-zinc-300">{evidenceCount}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Reinforced</dt><dd className="text-right text-zinc-300">{memory.reinforcementCount || 0}×</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Retrievals</dt><dd className="text-right text-zinc-300">{memory.retrievalCount || 0}×</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Last recalled</dt><dd className="text-right text-zinc-300">{formatDate(memory.lastRecalledAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Pinned</dt><dd className="text-right text-zinc-300">{memory.pinned ? 'Yes' : 'No'}</dd></div>
              </dl>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/35 p-4">
              <h4 className="flex items-center gap-2 text-xs font-semibold text-zinc-200"><Link2 className="h-3.5 w-3.5 text-sky-300" /> Source links</h4>
              <div className="mt-3 space-y-2 text-[11px] text-zinc-400">
                {memory.sourceConversationId ? <div className="flex items-center gap-2"><MessageSquare className="h-3 w-3 text-zinc-600" />Conversation <span className="truncate text-zinc-300">{memory.sourceConversationId}</span></div> : null}
                {memory.sourceArtifactId ? <div className="flex items-center gap-2"><FileText className="h-3 w-3 text-zinc-600" />Artifact <span className="truncate text-zinc-300">{memory.sourceArtifactId}</span></div> : null}
                {!memory.sourceConversationId && !memory.sourceArtifactId ? <span>No direct source link was recorded.</span> : null}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/35 p-4">
              <h4 className="flex items-center gap-2 text-xs font-semibold text-zinc-200"><Clock3 className="h-3.5 w-3.5 text-amber-300" /> Lifecycle</h4>
              <dl className="mt-3 space-y-2 text-[11px]">
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Lifecycle</dt><dd className="text-right text-zinc-300">{memory.lifecycle || 'persistent'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Expires</dt><dd className="text-right text-zinc-300">{formatDate(memory.expiresAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Supersedes</dt><dd className="text-right text-zinc-300">{memory.supersedesMemoryId || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-600">Superseded by</dt><dd className="text-right text-zinc-300">{memory.supersededByMemoryId || '—'}</dd></div>
              </dl>
            </div>
          </div>

          {evidenceIds.length > 0 && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/35 p-4">
              <h4 className="text-xs font-semibold text-zinc-200">Supporting evidence records</h4>
              <div className="mt-3 flex flex-wrap gap-1.5">{evidenceIds.map((id) => <span key={id} className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-500">{id}</span>)}</div>
              {evidenceCount > evidenceIds.length && <p className="mt-2 text-[10px] text-zinc-600">Showing the retained evidence references; aggregate evidence count is {evidenceCount}.</p>}
            </div>
          )}

          {related.length > 0 && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/35 p-4">
              <h4 className="text-xs font-semibold text-zinc-200">Related memories</h4>
              <div className="mt-3 space-y-2">{related.map((item) => <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-[11px] text-zinc-400"><span className="text-zinc-200">{item.category}</span> · {item.content}</div>)}</div>
            </div>
          )}

          {conflictIds.length > 0 && (
            <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-[11px] text-rose-200"><div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-3.5 w-3.5" /> Conflicting evidence is unresolved</div><p className="mt-2 text-rose-200/70">Related conflict records: {conflictIds.join(', ')}</p></div>
          )}

          {state === 'archived' && <div className="mt-4 flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-[10px] text-zinc-500"><Archive className="mt-0.5 h-3.5 w-3.5" /> This memory is retained for history but excluded from ordinary retrieval.</div>}
          {state === 'conflicted' && <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-[10px] text-rose-200/70"><AlertTriangle className="mt-0.5 h-3.5 w-3.5" /> This memory is currently withheld from ordinary retrieval until the conflict is resolved.</div>}
        </main>
      </section>
    </div>
  );
};
