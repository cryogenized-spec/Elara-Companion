import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, Image as ImageIcon, Camera, X } from 'lucide-react';
import { CameraModal } from './CameraModal';

interface MessageComposerProps {
  onSendMessage: (text: string, image?: string) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  disabled?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Click outside to close attachment menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((input.trim() || attachedImage) && !isStreaming && !disabled) {
      onSendMessage(input.trim(), attachedImage || undefined);
      setInput('');
      setAttachedImage(null);
      setIsMenuOpen(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input so the same file can be selected again if desired
    e.target.value = '';
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAttachedImage(result);
        setIsMenuOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Paste image handler from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  return (
    <footer className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:p-6 md:pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent shrink-0 relative">
      {/* Hidden File Input for Gallery / Local Files */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Live Camera Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(imageData) => {
          setAttachedImage(imageData);
          setIsCameraOpen(false);
        }}
      />

      <div className="max-w-2xl mx-auto">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative group bg-zinc-900 border ${
            isDragging ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-zinc-800'
          } rounded-2xl p-2.5 transition-all shadow-2xl`}
        >
          {/* Attached Image Thumbnail Preview Bar */}
          {attachedImage && (
            <div className="mb-2 px-2 pt-1 flex items-center gap-2">
              <div className="relative group/thumb rounded-xl overflow-hidden border border-sky-500/40 bg-zinc-950 w-16 h-16 shrink-0 shadow-md">
                <img
                  src={attachedImage}
                  alt="Attached preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 hover:bg-black text-white hover:text-red-400 transition-colors"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-zinc-200 truncate">Image Attached</p>
                <p className="text-[11px] text-sky-400">Ready to send to Elara</p>
              </div>
              <button
                onClick={() => setAttachedImage(null)}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={attachedImage ? 'Add a message about this image (optional)...' : 'Message Elara...'}
            disabled={disabled}
            rows={2}
            className="w-full bg-transparent text-zinc-100 px-2 py-1.5 focus:outline-none transition-all resize-none min-h-[56px] max-h-48 placeholder-zinc-500 text-sm leading-relaxed"
          />

          {/* Action Toolbar Inside Composer */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 mt-1 px-1">
            {/* Left Tools / Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-mono">
                Shift + Enter for new line
              </span>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2 relative" ref={menuRef}>
              {/* Paperclip Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  disabled={isStreaming || disabled}
                  className={`p-2 rounded-xl transition-all ${
                    isMenuOpen || attachedImage
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-transparent'
                  }`}
                  title="Attach image from gallery or take camera photo"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Paperclip Popup Menu */}
                {isMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-52 bg-zinc-950 border border-zinc-800 rounded-2xl p-1.5 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1 backdrop-blur-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-900 transition-colors"
                    >
                      <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                        <ImageIcon className="w-3.5 h-3.5" />
                      </div>
                      <span>Upload from Gallery</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsCameraOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-900 transition-colors"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                      <span>Take Photo with Camera</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Stop / Send Button */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center gap-1.5 text-xs font-medium"
                  title="Stop generation"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={(!input.trim() && !attachedImage) || disabled}
                  className="bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white p-2 rounded-xl transition-all shadow-lg shadow-sky-900/20"
                  title="Send message (Enter)"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
