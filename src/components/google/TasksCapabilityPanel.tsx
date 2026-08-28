import React, { useState } from 'react';
import { completeTask, createTask, getTasks, type TaskItem } from '../../services/googleTasksService';

export interface TasksCapabilityPanelProps { canUse: boolean; onActivity?: (description: string, reversible?: boolean) => void; }

export function TasksCapabilityPanel({ canUse, onActivity }: TasksCapabilityPanelProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => { if (!canUse) return; setLoading(true); setError(null); try { const result = await getTasks(); setTasks(result.items); onActivity?.(`Read ${result.items.length} Google Task${result.items.length === 1 ? '' : 's'}`); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to read Tasks.'); } finally { setLoading(false); } };
  const add = async () => { if (!canUse || !title.trim()) return; setError(null); try { const task = await createTask(title.trim()); setTasks(prev => [task, ...prev]); setTitle(''); setNotice('Task created.'); onActivity?.(`Created Google Task “${task.title}”`, true); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create task.'); } };
  const complete = async (task: TaskItem) => { if (!canUse || task.status === 'completed') return; setError(null); try { const updated = await completeTask(task.id); setTasks(prev => prev.map(item => item.id === task.id ? { ...item, ...updated, status: 'completed' } : item)); setNotice(`Completed “${task.title}”.`); onActivity?.(`Completed Google Task “${task.title}”`, true); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to complete task.'); } };

  return <div className="space-y-5">
    <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">Tasks</p><h3 className="mt-1 text-lg font-semibold">Google Tasks</h3><p className="mt-1 text-sm text-white/50">Today’s task view with lightweight creation and completion; Google Tasks remains the system of record.</p></div>
    {!canUse ? <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">Task access is not enabled. Enable the capability from Permissions.</div> : <>
      <div className="flex gap-2"><input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} placeholder="New task…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none placeholder:text-white/25" /><button type="button" onClick={() => void add()} disabled={!title.trim()} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/[0.06] disabled:opacity-40">Create</button></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/[0.06] disabled:opacity-50">{loading ? 'Loading…' : 'Refresh tasks'}</button><a href="https://tasks.google.com/" target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium">Open Google Tasks</a></div>
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{error}</div>}{notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">{notice}</div>}
      <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">{tasks.length === 0 ? <div className="px-4 py-8 text-center text-sm text-white/35">No tasks loaded yet.</div> : tasks.map(task => <div key={task.id} className="flex items-center gap-3 px-4 py-3"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${task.status === 'completed' ? 'bg-emerald-300' : 'bg-white/30'}`} /><div className="min-w-0 flex-1"><p className={`text-sm ${task.status === 'completed' ? 'text-white/45 line-through' : 'text-white/80'}`}>{task.title}</p>{task.due && <p className="mt-1 text-xs text-white/35">Due {new Date(task.due).toLocaleString()}</p>}</div>{task.status !== 'completed' && <button type="button" onClick={() => void complete(task)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium">Complete</button>}</div>)}</div>
    </>}
  </div>;
}
