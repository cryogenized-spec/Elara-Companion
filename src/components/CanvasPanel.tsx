import React from 'react';
import { X, Copy, Code, Check, FileText } from 'lucide-react';
import { CanvasData } from '../types';
import { createGoogleDoc } from '../lib/googleApi';

interface CanvasPanelProps {
  canvas: CanvasData | null;
  onClose: () => void;
  onUpdateContent?: (newContent: string) => void;
}

export const CanvasPanel: React.FC<CanvasPanelProps> = ({ canvas, onClose, onUpdateContent }) => {
  const [copied, setCopied] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [localContent, setLocalContent] = React.useState('');

  React.useEffect(() => {
    if (canvas) {
      setLocalContent(canvas.content);
    }
  }, [canvas]);

  if (!canvas) return null;

  const handleCopy = async () => {
    try {
      const type = "text/plain";
      const blob = new Blob([localContent], { type });
      const htmlType = "text/html";
      const htmlBlob = new Blob([localContent], { type: htmlType });
      const data = [new ClipboardItem({ [type]: blob, [htmlType]: htmlBlob })];
      await navigator.clipboard.write(data);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleExportDocs = async () => {
    try {
      setExporting(true);
      const res = await createGoogleDoc(canvas.title || 'Elara Export', localContent);
      window.open(res.url, '_blank');
    } catch (err) {
      console.error('Failed to export to Google Docs:', err);
      alert('Failed to export to Google Docs. Make sure you authorized the app.');
    } finally {
      setExporting(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalContent(e.target.value);
    if (onUpdateContent) {
      onUpdateContent(e.target.value);
    }
  };

  return (
    <div className="w-80 md:w-96 lg:w-[500px] border-l border-zinc-800 bg-[#0d0d0d] flex flex-col shrink-0 z-20 transition-all duration-300">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <Code className="w-5 h-5 text-sky-400 shrink-0" />
          <h2 className="text-sm font-semibold text-zinc-100 truncate">{canvas.title || 'Canvas'}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={handleExportDocs}
            disabled={exporting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 text-xs transition-colors"
            title="Export to Google Docs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Docs'}</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
            title="Copy content"
          >
            {copied ? <Check className="w-4 h-4 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-zinc-950 overflow-hidden flex flex-col">
        <textarea
          value={localContent}
          onChange={handleContentChange}
          className="w-full h-full p-4 bg-transparent text-sm font-mono text-zinc-300 resize-none outline-none custom-scrollbar leading-relaxed"
          spellCheck="false"
        />
      </div>
    </div>
  );
};
