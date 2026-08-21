import React, { useEffect, useState } from 'react';
import type { CanvasData, Message } from '../types';
import { MarkdownMessageRenderer } from './MarkdownMessageRenderer';
import {
  ChatMessage as LegacyChatMessage,
  getAssistantBackgroundClasses,
  getUserBubbleClasses,
  EmailDraftButton,
} from './ChatMessageLegacy';
import { Copy, Check, RefreshCw, Edit3 } from 'lucide-react';

export { getAssistantBackgroundClasses, getUserBubbleClasses, EmailDraftButton } from './ChatMessageLegacy';

interface ChatMessageProps {
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

export const ChatMessage: React.FC<ChatMessageProps> = (props) => {
  if (props.message.role !== 'user') {
    return <LegacyChatMessage {...props} />;
  }

  return <UserMarkdownMessage {...props} />;
};

const UserMarkdownMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming,
  textBackground = 'slate',
  fontSize = 14,
  isLastUserMessage = false,
  onEditAndResend,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('elara:user-message-rendered', {
      detail: { id: message.id, content: message.content },
    }));
  }, [message.id, message.content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
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

  return (
    <div className="w-full py-2.5 transition-colors" data-elara-message-id={message.id} data-elara-message-role="user">
      <div className="w-full">
        <div className="flex flex-col items-end space-y-1.5 group w-full">
          {message.image && (
            <div className="max-w-[92%] rounded-2xl overflow-hidden border border-sky-500/30 bg-zinc-950 shadow-md">
              <img
                src={message.image}
                alt="User attachment"
                className="max-h-64 w-auto object-contain rounded-2xl cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => {
                  const win = window.open();
                  win?.document.write(`<img src="${message.image}" style="max-width:100%; height:auto;" />`);
                }}
              />
            </div>
          )}

          <div
            style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
            className={`${getUserBubbleClasses(textBackground)} px-4 py-3 rounded-2xl rounded-tr-none max-w-[95%] leading-relaxed transition-all`}
          >
            {isEditing ? (
              <div className="w-full min-w-[220px] sm:min-w-[320px]">
                <p className="text-[11px] font-semibold text-sky-200 mb-1.5 flex items-center gap-1">
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Last Message & Restart</span>
                </p>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveEdit();
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/30 text-white text-sm focus:outline-none focus:border-white resize-none font-sans leading-relaxed shadow-inner"
                  rows={Math.max(2, editContent.split('\n').length)}
                  autoFocus
                />
                <div className="flex items-center gap-2 mt-2 justify-end">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-black/30 hover:bg-black/50 text-white/90 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim()}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 transition-all shadow-md flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Save & Restart Chat</span>
                  </button>
                </div>
              </div>
            ) : (
              <MarkdownMessageRenderer className="break-words [&>p:last-child]:mb-0">
                {message.content}
              </MarkdownMessageRenderer>
            )}
          </div>

          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] text-zinc-500 font-mono">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {!isEditing && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Copy message"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>

                {isLastUserMessage && onEditAndResend && !isStreaming && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium transition-colors border border-zinc-700/60 shadow-sm"
                    title="Edit your last sent message and restart conversation from here"
                  >
                    <Edit3 className="w-3 h-3 text-sky-400" />
                    <span>Edit & Restart</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
