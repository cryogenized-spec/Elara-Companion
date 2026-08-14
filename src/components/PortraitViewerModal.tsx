import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2, Sparkles, Upload, Trash2 } from 'lucide-react';

interface PortraitViewerModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onUploadNew?: () => void;
  onRemoveCustom?: () => void;
  hasCustomImage?: boolean;
}

export const PortraitViewerModal: React.FC<PortraitViewerModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onUploadNew,
  onRemoveCustom,
  hasCustomImage,
}) => {
  const [scale, setScale] = useState(1);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');

  useEffect(() => {
    if (isOpen) {
      setScale(1);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((prev) => Math.min(prev + 0.25, 4));
      } else if (e.key === '-') {
        setScale((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === '0') {
        setScale(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[#060606]/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 md:p-6 overflow-hidden animate-fadeIn select-none"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="flex items-center justify-between w-full max-w-5xl mx-auto z-10 shrink-0 bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Elara — Cybernetic Consort</h3>
            <p className="text-[11px] text-zinc-400">4:5 Aspect Portrait Viewer</p>
          </div>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="flex items-center bg-zinc-800/80 rounded-xl p-1 border border-zinc-700/50">
            <button
              onClick={() => setScale((prev) => Math.max(prev - 0.25, 0.5))}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-2 text-sky-400 font-semibold min-w-[3.5rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((prev) => Math.min(prev + 0.25, 4))}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setScale(1)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors ml-1 border-l border-zinc-700/60 pl-2"
              title="Reset Zoom (0)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
            className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700/50 text-xs flex items-center gap-1.5 transition-colors hidden sm:flex"
            title="Toggle Fit Mode"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="capitalize">{fitMode}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 transition-colors ml-2"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 flex items-center justify-center p-2 my-2 overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative max-w-full max-h-full flex items-center justify-center">
          <div className="relative aspect-[4/5] w-auto max-w-full max-h-[75vh] rounded-2xl overflow-hidden border border-sky-500/30 shadow-[0_0_50px_rgba(56,189,248,0.15)] bg-zinc-950">
            <img
              src={imageSrc}
              alt="Elara Portrait"
              style={{
                transform: `scale(${scale})`,
                transition: 'transform 0.15s ease-out',
              }}
              className={`w-full h-full cursor-grab active:cursor-grabbing select-none ${
                fitMode === 'contain' ? 'object-contain' : 'object-cover'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div
        className="flex items-center justify-center space-x-3 w-full max-w-md mx-auto shrink-0 bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {onUploadNew && (
          <button
            onClick={onUploadNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-900/30 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New Portrait</span>
          </button>
        )}

        {hasCustomImage && onRemoveCustom && (
          <button
            onClick={onRemoveCustom}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-red-950/60 text-zinc-300 hover:text-red-300 border border-zinc-700 hover:border-red-800/60 text-xs font-medium transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset Default</span>
          </button>
        )}
      </div>
    </div>
  );
};
