import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Paperclip,
  Image as ImageIcon,
  Camera,
  X,
  Mic,
  RefreshCw,
  Check,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { CameraModal } from './CameraModal';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { ElaraSettings } from '../types';
import { setNextMemoryRetrievalQuery } from '../lib/contextManager';

interface MessageComposerProps {
  onSendMessage: (text: string, image?: string) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  disabled?: boolean;
  settings?: ElaraSettings;
  onUpdateSettings?: (newSettings: Partial<ElaraSettings>) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  disabled = false,
  settings,
  onUpdateSettings,
}) => {
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const voiceSettings = settings?.voiceSettings;
  const [autoSendEnabled, setAutoSendEnabled] = useState<boolean>(voiceSettings?.autoSendOnSilence ?? false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const baseInputRef = useRef<string>('');

  useEffect(() => {
    setAutoSendEnabled(settings?.voiceSettings?.autoSendOnSilence ?? false);
  }, [settings?.voiceSettings?.autoSendOnSilence]);

  const handleToggleAutoSend = () => {
    const current = settings?.voiceSettings;
    const nextVal = !autoSendEnabled;
    setAutoSendEnabled(nextVal);
    if (onUpdateSettings) {
      onUpdateSettings({
        voiceSettings: {
          ...(current || {
            language: 'en-US',
            autoSendOnSilence: false,
            autoCapitalize: true,
            silenceTimeoutMs: 2500,
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
          }),
          autoSendOnSilence: nextVal,
        },
      });
    }
  };

  const handleTranscriptChange = (liveText: string) => {
    if (!liveText) return;
    const base = baseInputRef.current.trim();
    const next = liveText.trim();
    const combined = base ? `${base} ${next}` : next;
    setInput(combined);
  };

  const handleTranscriptDone = (finalText: string) => {
    if (!finalText) return;
    const base = baseInputRef.current.trim();
    const next = finalText.trim();
    const combined = base ? `${base} ${next}` : next;
    setInput(combined);
    baseInputRef.current = combined;

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    }, 60);
  };

  const handleAutoSend = (finalText: string) => {
    const base = baseInputRef.current.trim();
    const next = finalText.trim();
    const combinedText = base ? `${base} ${next}` : next;

    if ((combinedText || attachedImage) && !isStreaming && !disabled) {
      setNextMemoryRetrievalQuery(combinedText);
      onSendMessage(combinedText, attachedImage || undefined);
      setInput('');
      baseInputRef.current = '';
      setAttachedImage(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const {
    isListening,
    isTranscribing,
    interimText,
    error: speechError,
    waveformBars,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechToText({
    voiceSettings: voiceSettings,
    onTranscriptChange: handleTranscriptChange,
    onTranscriptDone: handleTranscriptDone,
    onAutoSend: handleAutoSend,
  });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input, interimText]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const sendOnEnter = settings?.sendOnEnter ?? false;
    if (sendOnEnter) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isListening) stopListening();
    if ((input.trim() || attachedImage) && !isStreaming && !disabled) {
      setNextMemoryRetrievalQuery(input.trim());
      onSendMessage(input.trim(), attachedImage || undefined);
      setInput('');
      baseInputRef.current = '';
      setAttachedImage(null);
      setIsMenuOpen(false);
      resetTranscript();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          break;
        }
      }
    }
  };

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
    if (file && file.type.startsWith('image/')) processFile(file);
  };

  const toggleMic = () => {
    if (isListening) stopListening();
    else {
      baseInputRef.current = input;
      startListening();
    }
  };

  const handleDoneClick = () => stopListening();

  return (
    <footer className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:p-6 md:pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent shrink-0 relative">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(imageData) => {
          setAttachedImage(imageData);
          setIsCameraOpen(false);
        }}
      />

      <div className="max-w-2xl mx-auto space-y-2">
        {isListening && (
          <div className="bg-zinc-950/95 border border-emerald-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative z-10" />
                </div>
                <div className="flex items-center gap-1 h-5 px-1 py-0.5 bg-zinc-900/90 rounded-lg border border-zinc-800 shrink-0">
                  {waveformBars.map((barVal, idx) => (
                    <div key={idx} className="w-1 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, Math.round(barVal * 18))}px`, opacity: Math.max(0.4, barVal) }} />
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 truncate">
                    <span>Listening...</span>
                    {voiceSettings?.language && <span className="text-[10px] text-zinc-400 font-mono font-normal">({voiceSettings.language})</span>}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {interimText ? <span className="italic text-zinc-200">"{interimText}"</span> : 'Speak now, tap Done when finished'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={handleToggleAutoSend} className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border transition-all flex items-center gap-1 ${autoSendEnabled ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-sm' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`} title="When enabled, automatically sends message after silence">
                  <Zap className={`w-3 h-3 ${autoSendEnabled ? 'text-emerald-400 fill-emerald-400' : 'text-zinc-500'}`} />
                  <span className="hidden sm:inline">Auto-send:</span>
                  <span>{autoSendEnabled ? 'On' : 'Off'}</span>
                </button>
                <button type="button" onClick={handleDoneClick} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-950/30 flex items-center gap-1.5 cursor-pointer" title="Finish recording and insert text">
                  <Check className="w-3.5 h-3.5" /><span>Done</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {isTranscribing && (
          <div className="bg-zinc-950/95 border border-sky-500/40 rounded-2xl p-2.5 shadow-xl flex items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 text-sky-400"><RefreshCw className="w-4 h-4 animate-spin shrink-0" /><span className="font-medium text-zinc-200">Parsing and transcribing audio with Gemini engine...</span></div>
          </div>
        )}

        {speechError && (
          <div className="bg-red-950/80 border border-red-800/60 rounded-2xl p-2.5 shadow-lg flex items-center justify-between gap-2 text-xs text-red-200 animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0"><AlertCircle className="w-4 h-4 text-red-400 shrink-0" /><span className="truncate">{speechError}</span></div>
            <button type="button" onClick={resetTranscript} className="text-[11px] text-red-400 hover:text-red-300 font-medium px-1.5 py-0.5 rounded hover:bg-red-900/40 shrink-0">Dismiss</button>
          </div>
        )}

        <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`relative group bg-zinc-900 border ${isListening ? 'border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-emerald-950/20' : isDragging ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-zinc-800'} rounded-2xl p-2.5 transition-all shadow-2xl`}>
          {attachedImage && (
            <div className="mb-2 px-2 pt-1 flex items-center gap-2">
              <div className="relative group/thumb rounded-xl overflow-hidden border border-sky-500/40 bg-zinc-950 w-16 h-16 shrink-0 shadow-md">
                <img src={attachedImage} alt="Attached preview" className="w-full h-full object-cover" />
                <button onClick={() => setAttachedImage(null)} className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 hover:bg-black text-white hover:text-red-400 transition-colors" title="Remove image"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="min-w-0 flex-1"><p className="text-xs font-medium text-zinc-200 truncate">Image Attached</p><p className="text-[11px] text-sky-400">Ready to send to Elara</p></div>
              <button onClick={() => setAttachedImage(null)} className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors">Clear</button>
            </div>
          )}

          <div className="relative">
            <textarea ref={textareaRef} value={input} onChange={(e) => { setInput(e.target.value); baseInputRef.current = e.target.value; }} onKeyDown={handleKeyDown} onPaste={handlePaste} placeholder={isListening ? 'Listening to your voice... (Speak now)' : isTranscribing ? 'Transcribing your audio...' : attachedImage ? 'Add a message about this image (optional)...' : 'Message Elara...'} disabled={disabled} rows={2} className="w-full bg-transparent text-zinc-100 px-2 py-1.5 focus:outline-none transition-all resize-none min-h-[56px] max-h-48 placeholder-zinc-500 text-sm leading-relaxed" />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 mt-1 px-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">{(settings?.sendOnEnter ?? false) ? 'Enter to send • Shift+Enter newline' : 'Enter for newline • Click Send'}</span>
              {autoSendEnabled && !isListening && <span className="text-[10px] text-emerald-400/90 font-medium flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded-md"><Zap className="w-2.5 h-2.5 fill-emerald-400" /><span>Voice Auto-send</span></span>}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 relative" ref={menuRef}>
              <div className="relative">
                <button type="button" onClick={() => setIsMenuOpen((prev) => !prev)} disabled={isStreaming || disabled} className={`p-2 rounded-xl transition-all ${isMenuOpen || attachedImage ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-transparent'}`} title="Attach image from gallery or take camera photo"><Paperclip className="w-4 h-4" /></button>
                {isMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-52 bg-zinc-950 border border-zinc-800 rounded-2xl p-1.5 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1 backdrop-blur-lg">
                    <button type="button" onClick={() => { setIsMenuOpen(false); fileInputRef.current?.click(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-900 transition-colors"><div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400"><ImageIcon className="w-3.5 h-3.5" /></div><span>Upload from Gallery</span></button>
                    <button type="button" onClick={() => { setIsMenuOpen(false); setIsCameraOpen(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-900 transition-colors"><div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><Camera className="w-3.5 h-3.5" /></div><span>Take Photo with Camera</span></button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button type="button" onClick={toggleMic} disabled={isStreaming || disabled || isTranscribing} className={`p-2 rounded-xl transition-all relative ${isListening ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-950/40 ring-2 ring-emerald-500/30' : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 border border-transparent'}`} title={isListening ? 'Click to stop listening' : 'Voice Input: Speak to transcribe into chat'}>
                  {isListening ? <><Mic className="w-4 h-4 text-emerald-400 animate-pulse" /><span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" /></> : isTranscribing ? <RefreshCw className="w-4 h-4 animate-spin text-sky-400" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {isStreaming ? (
                <button type="button" onClick={onStopStreaming} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center gap-1.5 text-xs font-medium" title="Stop generation"><Square className="w-3.5 h-3.5 fill-current" /><span>Stop</span></button>
              ) : (
                <button type="button" onClick={handleSend} disabled={(!input.trim() && !attachedImage) || disabled} className="bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white p-2 rounded-xl transition-all shadow-lg shadow-sky-900/20 cursor-pointer" title={(settings?.sendOnEnter ?? false) ? 'Send message (Enter)' : 'Send message (Click or Ctrl+Enter)'}><Send className="w-4 h-4" /></button>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};