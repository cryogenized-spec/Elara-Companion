import React, { useState } from 'react';
import { X, Copy, Code, Check, FileText, Bookmark, Download, Eye, Edit3, ExternalLink } from 'lucide-react';
import { CanvasData } from '../types';
import { createGoogleDoc, createKeepNote } from '../lib/googleApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface CanvasModalProps {
  canvas: CanvasData | null;
  onClose: () => void;
  onUpdateContent?: (newContent: string) => void;
}

export const CanvasModal: React.FC<CanvasModalProps> = ({ canvas, onClose, onUpdateContent }) => {
  const [copied, setCopied] = useState(false);
  const [exportingDocs, setExportingDocs] = useState(false);
  const [savingKeep, setSavingKeep] = useState(false);
  const [localContent, setLocalContent] = useState(canvas?.content || '');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; link?: string } | null>(null);

  React.useEffect(() => {
    if (canvas) {
      setLocalContent(canvas.content);
      setStatusMessage(null);
    }
  }, [canvas]);

  if (!canvas) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleExportDocs = async () => {
    try {
      setExportingDocs(true);
      setStatusMessage(null);
      const res = await createGoogleDoc(canvas.title || 'Elara Canvas Export', localContent);
      setStatusMessage({
        type: 'success',
        text: 'Exported to Google Docs!',
        link: res.url,
      });
      window.open(res.url, '_blank');
    } catch (err: any) {
      console.error('Failed to export to Google Docs:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to export to Docs. Check Google authorization.',
      });
    } finally {
      setExportingDocs(false);
    }
  };

  const handleSaveToKeep = async () => {
    try {
      setSavingKeep(true);
      setStatusMessage(null);
      const note = await createKeepNote(canvas.title || 'Canvas Note', localContent, ['Canvas']);
      setStatusMessage({
        type: 'success',
        text: 'Saved to Google Keep Archive!',
        link: note.url,
      });
    } catch (err: any) {
      console.error('Failed to save to Keep:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to save to Keep Archive.',
      });
    } finally {
      setSavingKeep(false);
    }
  };

  const handleDownload = () => {
    const filename = `${(canvas.title || 'canvas_output').replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.md`;
    const blob = new Blob([localContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalContent(e.target.value);
    if (onUpdateContent) {
      onUpdateContent(e.target.value);
    }
  };

  const wordCount = localContent.trim() ? localContent.trim().split(/\s+/).length : 0;
  const charCount = localContent.length;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-3 sm:p-6">
      <div className="bg-[#0f0f12] border border-zinc-800 rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-sky-950/70 border border-sky-500/30 text-sky-400 shrink-0">
              <Code className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-100 truncate">{canvas.title || 'Canvas'}</h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                {wordCount} words • {charCount} characters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
              className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 px-2.5 ${
                viewMode === 'preview'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {viewMode === 'edit' ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span>{viewMode === 'edit' ? 'Preview' : 'Edit'}</span>
            </button>

            {/* Save to Keep */}
            <button
              onClick={handleSaveToKeep}
              disabled={savingKeep}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-700/40 text-xs font-medium transition-colors disabled:opacity-50"
              title="Save to Google Keep"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{savingKeep ? 'Saving...' : 'Keep'}</span>
            </button>

            {/* Export Docs */}
            <button
              onClick={handleExportDocs}
              disabled={exportingDocs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/40 text-xs font-medium transition-colors disabled:opacity-50"
              title="Export to Google Docs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{exportingDocs ? 'Exporting...' : 'Docs'}</span>
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors border border-zinc-700/50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-300" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors border border-zinc-700/50"
              title="Download markdown file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Notice Banner */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between gap-2 shrink-0 border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800/50 text-emerald-300'
                : 'bg-red-950/60 border-red-800/50 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            {statusMessage.link && (
              <a
                href={statusMessage.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline text-emerald-400 hover:text-emerald-200 font-medium"
              >
                <span>Open in Google Docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 bg-zinc-950 overflow-hidden flex flex-col p-4">
          {viewMode === 'edit' ? (
            <textarea
              value={localContent}
              onChange={handleContentChange}
              className="w-full h-full bg-transparent text-xs sm:text-sm font-mono text-zinc-200 resize-none outline-none custom-scrollbar leading-relaxed selection:bg-sky-500/30"
              spellCheck="false"
            />
          ) : (
            <div className="w-full h-full overflow-auto custom-scrollbar text-xs sm:text-sm text-zinc-200 leading-relaxed space-y-3 font-sans select-text">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {localContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
