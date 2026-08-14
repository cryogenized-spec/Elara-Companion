import React, { useRef, useState } from 'react';
import { Sparkles, Upload, Trash2, Maximize2, RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react';
import { DEFAULT_ELARA_PORTRAIT } from '../constants/defaultPortrait';
import { PortraitViewerModal } from './PortraitViewerModal';

interface ElaraPortraitProps {
  customPortrait: string | null;
  onUploadPortrait: (base64Img: string) => void;
  onRemovePortrait: () => void;
  portraitScale?: number;
  compactMobile?: boolean;
}

export const ElaraPortrait: React.FC<ElaraPortraitProps> = ({
  customPortrait,
  onUploadPortrait,
  onRemovePortrait,
  portraitScale = 1.0,
  compactMobile = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeImage = customPortrait || DEFAULT_ELARA_PORTRAIT;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image file is too large. Please select an image under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadPortrait(reader.result);
      }
    };
    reader.readAsDataURL(file);
    // Reset input value
    e.target.value = '';
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Portrait Component Container */}
      <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl transition-all">
        {/* Header Bar */}
        <div className="px-3.5 py-2.5 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-zinc-200 tracking-tight truncate">
              Elara Portrait
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setFitMode((prev) => (prev === 'cover' ? 'contain' : 'cover'))}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title={`Toggle Fit (${fitMode})`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors hidden lg:block"
              title={isCollapsed ? 'Expand Portrait' : 'Collapse Portrait'}
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="p-3 space-y-3">
            {/* 4:5 Aspect Ratio Image Frame */}
            <div
              onClick={() => setIsViewerOpen(true)}
              className="relative aspect-[4/5] w-full rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/80 cursor-pointer group shadow-inner"
            >
              <img
                src={activeImage}
                alt="Elara Consort"
                className={`w-full h-full transition-all duration-200 ${
                  fitMode === 'cover' ? 'object-cover' : 'object-contain p-1'
                }`}
              />

              {/* Hover Overlay Prompt */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <div className="flex items-center justify-between text-xs text-sky-300 font-medium">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Tap to view & zoom
                  </span>
                  <span className="text-[10px] bg-sky-950/80 border border-sky-500/30 px-1.5 py-0.5 rounded text-sky-400">
                    4:5
                  </span>
                </div>
              </div>
            </div>

            {/* Controls Bar: Upload / Replace / Remove */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleTriggerUpload}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-all shadow-sm"
                title="Upload custom image"
              >
                {customPortrait ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-sky-400" />
                    <span>Replace</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3 h-3 text-sky-400" />
                    <span>Upload Image</span>
                  </>
                )}
              </button>

              {customPortrait && (
                <button
                  onClick={onRemovePortrait}
                  className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-red-950/50 text-zinc-400 hover:text-red-400 border border-zinc-700/60 transition-colors"
                  title="Remove custom portrait"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enlarged Zoomable Modal */}
      <PortraitViewerModal
        isOpen={isViewerOpen}
        imageSrc={activeImage}
        onClose={() => setIsViewerOpen(false)}
        onUploadNew={handleTriggerUpload}
        onRemoveCustom={customPortrait ? onRemovePortrait : undefined}
        hasCustomImage={!!customPortrait}
      />
    </>
  );
};
