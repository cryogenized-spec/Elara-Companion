import React, { useEffect, useState } from 'react';
import { Check, Code, Copy, Download, Edit3, ExternalLink, Eye, FileText, X } from 'lucide-react';
import type { CanvasData } from '../types';
import { createGoogleDoc } from '../services/googleDocsDriveService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface CanvasPanelProps { canvas: CanvasData | null; onClose: () => void; onUpdateContent?: (newContent: string) => void; }

export const CanvasPanel: React.FC<CanvasPanelProps> = ({ canvas, onClose, onUpdateContent }) => {
  const [copied, setCopied] = useState(false);
  const [exportingDocs, setExportingDocs] = useState(false);
  const [localContent, setLocalContent] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [status, setStatus] = useState<{type:'success'|'error';text:string;link?:string}|null>(null);

  useEffect(() => { if (canvas) { setLocalContent(canvas.content); setStatus(null); } }, [canvas]);
  if (!canvas) return null;

  const copy = async () => { try { await navigator.clipboard.writeText(localContent); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch (error) { console.error('Failed to copy text:', error); } };
  const exportDocs = async () => { try { setExportingDocs(true); setStatus(null); const result = await createGoogleDoc(canvas.title || 'Elara Canvas Export', localContent); setStatus({ type:'success', text:'Exported to Google Docs!', link:result.url }); window.open(result.url, '_blank'); } catch (error:any) { setStatus({ type:'error', text:error?.message || 'Failed to export to Docs. Check Google authorization.' }); } finally { setExportingDocs(false); } };
  const download = () => { const filename = `${(canvas.title || 'canvas_output').replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.md`; const blob = new Blob([localContent], { type:'text/markdown;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href=url; link.download=filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); };
  const change = (event: React.ChangeEvent<HTMLTextAreaElement>) => { const next = event.target.value; setLocalContent(next); onUpdateContent?.(next); };
  const words = localContent.trim() ? localContent.trim().split(/\s+/).length : 0;
  return <div className="w-80 md:w-96 lg:w-[520px] border-l border-zinc-800 bg-[#0c0c0e] flex flex-col shrink-0 z-20 shadow-2xl">
    <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 shrink-0">
      <div className="flex items-center gap-2 min-w-0"><div className="p-1.5 rounded-lg bg-sky-950/70 border border-sky-500/30 text-sky-400 shrink-0"><Code className="w-4 h-4"/></div><div className="min-w-0"><h2 className="text-xs font-semibold text-zinc-100 truncate">{canvas.title || 'Canvas Workspace'}</h2><p className="text-[10px] text-zinc-400 font-mono">{words} words • {localContent.length} chars</p></div></div>
      <div className="flex items-center gap-1 shrink-0"><button onClick={()=>setViewMode(viewMode==='edit'?'preview':'edit')} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" title="Toggle Markdown view">{viewMode==='edit'?<Eye className="w-3.5 h-3.5"/>:<Edit3 className="w-3.5 h-3.5"/>}</button><button onClick={exportDocs} disabled={exportingDocs} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-950/50 text-emerald-300 border border-emerald-700/40 text-[11px] disabled:opacity-50" title="Export to Google Docs"><FileText className="w-3 h-3"/><span className="hidden sm:inline">{exportingDocs?'Exporting...':'Docs'}</span></button><button onClick={copy} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700/50" title="Copy">{copied?<Check className="w-3.5 h-3.5"/>:<Copy className="w-3.5 h-3.5"/>}</button><button onClick={download} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700/50" title="Download"><Download className="w-3.5 h-3.5"/></button><button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800" title="Close"><X className="w-4 h-4"/></button></div>
    </div>
    {status&&<div className={`px-3 py-2 text-xs border-b ${status.type==='success'?'bg-emerald-950/60 border-emerald-800/50 text-emerald-300':'bg-red-950/60 border-red-800/50 text-red-300'}`}><span>{status.text}</span>{status.link&&<a href={status.link} target="_blank" rel="noreferrer" className="ml-2 underline inline-flex items-center gap-1">Open<ExternalLink className="w-3 h-3"/></a>}</div>}
    <div className="flex-1 bg-zinc-950 overflow-hidden">{viewMode==='edit'?<textarea value={localContent} onChange={change} placeholder="Canvas content..." className="w-full h-full p-4 bg-transparent text-xs font-mono text-zinc-200 resize-none outline-none custom-scrollbar leading-relaxed" spellCheck={false}/>:<div className="w-full h-full p-4 overflow-y-auto custom-scrollbar text-xs text-zinc-200 leading-relaxed font-sans select-text"><ReactMarkdown remarkPlugins={[remarkGfm,remarkBreaks]}>{localContent}</ReactMarkdown></div>}</div>
  </div>;
};
