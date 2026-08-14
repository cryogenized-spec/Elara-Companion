import React from 'react';
import { X, Copy, Code, Check } from 'lucide-react';
import { CanvasData } from '../types';

interface CanvasModalProps {
  canvas: CanvasData | null;
  onClose: () => void;
}

export const CanvasModal: React.FC<CanvasModalProps> = ({ canvas, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!canvas) return null;

  const handleCopy = async () => {
    try {
      const type = "text/plain";
      const blob = new Blob([canvas.content], { type });
      const htmlType = "text/html";
      const htmlBlob = new Blob([canvas.content], { type: htmlType });
      const data = [new ClipboardItem({ [type]: blob, [htmlType]: htmlBlob })];
      await navigator.clipboard.write(data);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50 shrink-0">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-semibold text-zinc-100">{canvas.title || 'Canvas'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-zinc-950 overflow-auto p-4 custom-scrollbar text-sm font-mono text-zinc-300">
          <pre className="whitespace-pre-wrap">{canvas.content}</pre>
        </div>

      </div>
    </div>
  );
};
