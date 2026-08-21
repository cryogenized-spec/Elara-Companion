import React, { useEffect, useState } from 'react';
import type { CanvasData, Message } from '../types';
import { getArtifactById } from '../lib/workspaceStorage';
import { ThinkingScratchpad } from './ThinkingScratchpad';
import { MarkdownMessageRenderer } from './MarkdownMessageRenderer';
import { Copy, Check, RefreshCw, Edit3, AlertTriangle, Sliders, Play, FileText, ArrowRight, ExternalLink } from 'lucide-react';
import { EmailDraftButton } from './EmailDraftButton';

export interface UnifiedChatMessageProps {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
  portraitImage?: string | null;
  fontSize?: number;
  textBackground?: string;
  isLastUserMessage?: boolean;
  onRegenerate?: () => void;
  onEditAndResend?: (messageId: string, newContent: string) => void;
  onRetry?: () => void;
  onCompleteResponse?: () => void;
  onOpenSettings?: () => void;
  onOpenCanvas?: (canvas: CanvasData) => void;
  onOpenArtifact?: (artifactId: string) => void;
}

export const getAssistantBackgroundClasses = (bgStyle?: string) => {
  switch (bgStyle) {
    case 'deep-onyx': return 'bg-[#000000]/95 border border-zinc-800 text-zinc-100 shadow-2xl';
    case 'midnight-blue': return 'bg-[#080f20]/95 border border-sky-900/60 text-zinc-100 shadow-2xl';
    case 'cyber-violet': return 'bg-[#120824]/95 border border-purple-900/60 text-zinc-100 shadow-2xl';
    case 'emerald-terminal': return 'bg-[#05140d]/95 border border-emerald-900/60 text-emerald-100 shadow-2xl';
    case 'frosted-glass': return 'bg-zinc-900/50 backdrop-blur-xl border border-white/10 text-zinc-100 shadow-xl';
    case 'high-contrast': return 'bg-zinc-900 border-2 border-zinc-600 text-white shadow-xl';
    default: return 'bg-zinc-900/90 border border-zinc-800/80 text-zinc-200 shadow-md';
  }
};

export const getUserBubbleClasses = (bgStyle?: string) => {
  switch (bgStyle) {
    case 'deep-onyx': return 'bg-zinc-800/95 border border-zinc-700 text-white shadow-lg';
    case 'midnight-blue': return 'bg-sky-700/90 border border-sky-500/40 text-white shadow-lg';
    case 'cyber-violet': return 'bg-purple-700/90 border border-purple-500/40 text-white shadow-lg';
    case 'emerald-terminal': return 'bg-emerald-700/90 border border-emerald-500/40 text-white shadow-lg';
    case 'frosted-glass': return 'bg-sky-600/70 backdrop-blur-xl border border-sky-300/30 text-white shadow-lg';
    case 'high-contrast': return 'bg-sky-600 border-2 border-sky-300 text-white shadow-xl';
    default: return 'bg-sky-600/90 text-white shadow-lg';
  }
};

const renderDocumentCards = (
  message: Message,
  onOpenCanvas?: (canvas: CanvasData) => void,
  onOpenArtifact?: (artifactId: string) => void,
) => {
  const renderedArtifactIds = new Set<string>();
  const documentCards: { id: string; name: string; type: string; provider?: string; url?: string; isLegacyCanvas?: boolean; canvas?: CanvasData }[] = [];

  for (const artId of message.artifactIds || []) {
    const art = getArtifactById(artId);
    if (art && !renderedArtifactIds.has(art.id)) {
      renderedArtifactIds.add(art.id);
      documentCards.push({ id: art.id, name: art.name, type: art.type || 'markdown', provider: art.provider || 'local', url: art.url });
    }
  }

  for (const canvas of message.canvases || []) {
    if (canvas.artifactId && !renderedArtifactIds.has(canvas.artifactId)) {
      const art = getArtifactById(canvas.artifactId);
      renderedArtifactIds.add(canvas.artifactId);
      documentCards.push({ id: canvas.artifactId, name: art?.name || canvas.title, type: art?.type || 'markdown', provider: art?.provider || 'local', url: art?.url, canvas });
    } else if (!canvas.artifactId) {
      documentCards.push({ id: `legacy_${canvas.title}`, name: canvas.title, type: 'markdown', provider: 'local', isLegacyCanvas: true, canvas });
    }
  }

  if (!documentCards.length) return null;

  return (
    <div className="flex flex-col gap-2.5 mt-3 pt-3 border-t border-zinc-700/50">
      {documentCards.map((doc, idx) => (
        <div key={`${doc.id}_${idx}`} className={`group/card rounded-xl border p-3.5 transition-all shadow-sm flex flex-col gap-2 ${doc.provider === 'google_docs' ? 'border-blue-500/30 bg-blue-950/20 hover:bg-blue-950/30' : 'border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/30'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className={`flex items-center gap-2 text-[11px] font-semibold ${doc.provider === 'google_docs' ? 'text-blue-400' : 'text-emerald-400'}`}>
              <FileText className="w-3.5 h-3.5" />
              <span>{doc.provider === 'google_docs' ? 'Google Doc' : 'Workspace Document'}</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${doc.provider === 'google_docs' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
              {doc.provider === 'google_docs' ? 'Google Cloud' : (doc.type || 'Markdown')}
            </span>
          </div>

          <h4 className={`text-sm font-semibold text-zinc-100 transition-colors truncate ${doc.provider === 'google_docs' ? 'group-hover/card:text-blue-300' : 'group-hover/card:text-emerald-300'}`}>
            {doc.name || 'Untitled Document'}
          </h4>

          <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!doc.isLegacyCanvas && onOpenArtifact) onOpenArtifact(doc.id);
                  else if (doc.canvas && onOpenCanvas) onOpenCanvas(doc.canvas);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold shadow-md transition-all cursor-pointer active:scale-95 ${doc.provider === 'google_docs' ? 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-600/20' : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-600/20'}`}
              >
                <span>Open in Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {doc.url && (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-900/40 hover:bg-blue-800/60 border border-blue-500/30 text-blue-200 hover:text-white text-xs font-medium transition-colors no-underline" title="Open in Google Docs">
                  <span>Google Docs</span>
                  <ExternalLink className="w-3 h-3 text-blue-300" />
                </a>
              )}
            </div>

            {doc.isLegacyCanvas && doc.canvas && onOpenCanvas && (
              <button onClick={() => onOpenCanvas(doc.canvas!)} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
                View Legacy Canvas
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export const UnifiedChatMessage: React.FC<UnifiedChatMessageProps> = ({
  message,
  isLast,
  isStreaming,
  fontSize = 14,
  textBackground = 'slate',
  isLastUserMessage = false,
  onRegenerate,
  onEditAndResend,
  onRetry,
  onCompleteResponse,
  onOpenSettings,
  onOpenCanvas,
  onOpenArtifact,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isUser = message.role === 'user';

  useEffect(() => {
    if (!isUser || typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('elara:user-message-rendered', { detail: { id: message.id, content: message.content } }));
  }, [isUser, message.id, message.content]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEditAndResend) {
      onEditAndResend(message.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  if ((message.role as string) === 'system' || message.content.startsWith('[SYSTEM MESSAGE:')) return null;

  return (
    <div className="w-full py-2.5 transition-colors" data-elara-message-id={message.id} data-elara-message-role={message.role}>
      <div className="w-full">
        {isUser ? (
          <div className="flex flex-col items-end space-y-1.5 group w-full">
            {message.image && (
              <div className="max-w-[92%] rounded-2xl overflow-hidden border border-sky-500/30 bg-zinc-950 shadow-md">
                <img src={message.image} alt="User attachment" className="max-h-64 w-auto object-contain rounded-2xl cursor-pointer hover:opacity-95 transition-opacity" onClick={() => { const win = window.open(); win?.document.write(`<img src="${message.image}" style="max-width:100%; height:auto;" />`); }} />
              </div>
            )}

            <div style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }} className={`${getUserBubbleClasses(textBackground)} px-4 py-3 rounded-2xl rounded-tr-none max-w-[95%] leading-relaxed transition-all`}>
              {isEditing ? (
                <div className="w-full min-w-[220px] sm:min-w-[320px]">
                  <p className="text-[11px] font-semibold text-sky-200 mb-1.5 flex items-center gap-1"><Edit3 className="w-3 h-3" /><span>Edit Last Message & Restart</span></p>
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } }} className="w-full p-2.5 rounded-xl bg-black/40 border border-white/30 text-white text-sm focus:outline-none focus:border-white resize-none font-sans leading-relaxed shadow-inner" rows={Math.max(2, editContent.split('\n').length)} autoFocus />
                  <div className="flex items-center gap-2 mt-2 justify-end">
                    <button onClick={handleCancelEdit} className="px-3 py-1 rounded-lg text-xs font-medium bg-black/30 hover:bg-black/50 text-white/90 transition-colors">Cancel</button>
                    <button onClick={handleSaveEdit} disabled={!editContent.trim()} className="px-3 py-1 rounded-lg text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 transition-all shadow-md flex items-center gap-1"><RefreshCw className="w-3 h-3" /><span>Save & Restart Chat</span></button>
                  </div>
                </div>
              ) : (
                <MarkdownMessageRenderer className="break-words [&>p:last-child]:mb-0">{message.content}</MarkdownMessageRenderer>
              )}
            </div>

            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] text-zinc-500 font-mono">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {!isEditing && (
                <div className="flex items-center gap-1.5">
                  <button onClick={handleCopy} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors" title="Copy message">{copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}</button>
                  {isLastUserMessage && onEditAndResend && !isStreaming && (
                    <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium transition-colors border border-zinc-700/60 shadow-sm" title="Edit your last sent message and restart conversation from here"><Edit3 className="w-3 h-3 text-sky-400" /><span>Edit & Restart</span></button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-1.5 w-full group">
            <div style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }} className={`${getAssistantBackgroundClasses(textBackground)} px-4 py-3 rounded-2xl leading-relaxed transition-all overflow-hidden w-full`}>
              {(message.isThinking || (message.thoughts && message.thoughts.length > 0) || (message.rawThoughts && message.rawThoughts.trim().length > 0)) && (
                <ThinkingScratchpad isThinking={!!message.isThinking} isStreaming={isStreaming} activeSentence={message.currentThoughtSentence} thoughts={message.thoughts} rawThoughts={message.rawThoughts} thoughtDurationMs={message.thoughtDurationMs} />
              )}

              {message.isError ? (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs shadow-inner space-y-2.5">
                  <div className="flex items-start gap-2.5"><AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /><div className="flex-1 min-w-0"><p className="font-semibold text-red-200 text-xs tracking-wide">API Request Error</p><p className="text-red-300/90 text-xs mt-1 leading-relaxed break-words font-sans">{message.errorMessage || message.content}</p></div></div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-900/40">
                    {onOpenSettings && <button onClick={onOpenSettings} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-semibold shadow-md hover:shadow-sky-500/20 transition-all cursor-pointer active:scale-95"><Sliders className="w-3.5 h-3.5 text-sky-200" /><span>Change Model</span></button>}
                    {onRetry && <button onClick={onRetry} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"><RefreshCw className="w-3 h-3 text-zinc-400" /><span>Retry</span></button>}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <MarkdownMessageRenderer>{message.content}</MarkdownMessageRenderer>
                  {renderDocumentCards(message, onOpenCanvas, onOpenArtifact)}
                </div>
              )}

              {message.isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-sky-400 animate-pulse rounded-sm align-middle" />}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-0.5">
              <span className="text-[10px] text-zinc-500 font-mono">Elara • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <div className="flex items-center space-x-2">
                {isLast && !isStreaming && onCompleteResponse && !message.isError && <button onClick={onCompleteResponse} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-800/60 text-xs font-medium transition-colors shadow-sm" title="Prompt Elara to complete her last response"><Play className="w-3 h-3 text-sky-400 fill-sky-400/20" /><span>Complete Message</span></button>}
                <button onClick={handleCopy} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors" title="Copy response">{copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}</button>
                {isLast && !isStreaming && onRegenerate && !message.isError && <button onClick={onRegenerate} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors" title="Regenerate response"><RefreshCw className="w-3 h-3" /></button>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { EmailDraftButton } from './EmailDraftButton';
