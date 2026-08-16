import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Message, CanvasData } from '../types';
import { CodeBlock } from './CodeBlock';
import { ThinkingScratchpad } from './ThinkingScratchpad';
import { Copy, Check, RefreshCw, Edit3, AlertCircle, AlertTriangle, Sparkles, User, X, Play, Sliders, Code, Mail, ExternalLink } from 'lucide-react';

interface EmailDraftButtonProps {
  url: string;
  label?: string;
}

export const EmailDraftButton: React.FC<EmailDraftButtonProps> = ({
  url,
  label = 'Open Gmail Draft',
}) => {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-1.5 my-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-200 hover:text-white text-xs font-medium transition-all shadow-sm group no-underline"
      title="Open draft in Gmail"
    >
      <div className="p-1 rounded-lg bg-red-900/60 text-red-400 group-hover:text-red-200">
        <Mail className="w-3.5 h-3.5" />
      </div>
      <span>{label}</span>
      <ExternalLink className="w-3 h-3 text-red-400/80 group-hover:text-red-200 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
};

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
}

export const getAssistantBackgroundClasses = (bgStyle?: string) => {
  switch (bgStyle) {
    case 'deep-onyx':
      return 'bg-[#000000]/95 border border-zinc-800 text-zinc-100 shadow-2xl';
    case 'midnight-blue':
      return 'bg-[#080f20]/95 border border-sky-900/60 text-zinc-100 shadow-2xl';
    case 'cyber-violet':
      return 'bg-[#120824]/95 border border-purple-900/60 text-zinc-100 shadow-2xl';
    case 'emerald-terminal':
      return 'bg-[#05140d]/95 border border-emerald-900/60 text-emerald-100 shadow-2xl';
    case 'frosted-glass':
      return 'bg-zinc-900/50 backdrop-blur-xl border border-white/10 text-zinc-100 shadow-xl';
    case 'high-contrast':
      return 'bg-zinc-900 border-2 border-zinc-600 text-white shadow-xl';
    case 'slate':
    default:
      return 'bg-zinc-900/90 border border-zinc-800/80 text-zinc-200 shadow-md';
  }
};

export const getUserBubbleClasses = (bgStyle?: string) => {
  switch (bgStyle) {
    case 'deep-onyx':
      return 'bg-zinc-800/95 border border-zinc-700 text-white shadow-lg';
    case 'midnight-blue':
      return 'bg-sky-700/90 border border-sky-500/40 text-white shadow-lg';
    case 'cyber-violet':
      return 'bg-purple-700/90 border border-purple-500/40 text-white shadow-lg';
    case 'emerald-terminal':
      return 'bg-emerald-700/90 border border-emerald-500/40 text-white shadow-lg';
    case 'frosted-glass':
      return 'bg-sky-600/70 backdrop-blur-xl border border-sky-300/30 text-white shadow-lg';
    case 'high-contrast':
      return 'bg-sky-600 border-2 border-sky-300 text-white shadow-xl';
    case 'slate':
    default:
      return 'bg-sky-600/90 text-white shadow-lg';
  }
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLast,
  isStreaming,
  portraitImage,
  fontSize = 14,
  textBackground = 'slate',
  isLastUserMessage = false,
  onRegenerate,
  onEditAndResend,
  onRetry,
  onCompleteResponse,
  onOpenSettings,
  onOpenCanvas,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  // Hide system messages and sync payloads from the user's chat bubble view
  if ((message.role as string) === 'system' || message.content.startsWith('[SYSTEM MESSAGE:')) {
    return null;
  }

  return (
    <div className="w-full py-2.5 transition-colors">
      <div className="w-full">
        {isUser ? (
          /* User Message - Right Aligned Bubble */
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
              className={`${getUserBubbleClasses(
                textBackground
              )} px-4 py-3 rounded-2xl rounded-tr-none max-w-[95%] leading-relaxed transition-all`}
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
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
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

                  {/* ONLY show Edit option on the user's last sent message */}
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
        ) : (
          /* Assistant Message - Full width card bordering the portrait with tiny space */
          <div className="flex flex-col space-y-1.5 w-full group">
            <div
              style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
              className={`${getAssistantBackgroundClasses(
                textBackground
              )} px-4 py-3 rounded-2xl leading-relaxed transition-all overflow-hidden w-full`}
            >
              {/* Thinking Scratchpad (Inline Thought Bar & Modal Trigger) */}
              {(message.isThinking ||
                (message.thoughts && message.thoughts.length > 0) ||
                (message.rawThoughts && message.rawThoughts.trim().length > 0)) && (
                <ThinkingScratchpad
                  isThinking={!!message.isThinking}
                  isStreaming={isStreaming}
                  activeSentence={message.currentThoughtSentence}
                  thoughts={message.thoughts}
                  rawThoughts={message.rawThoughts}
                  thoughtDurationMs={message.thoughtDurationMs}
                />
              )}

              {message.isError ? (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs shadow-inner space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-red-200 text-xs tracking-wide">
                        API Request Error
                      </p>
                      <p className="text-red-300/90 text-xs mt-1 leading-relaxed break-words font-sans">
                        {message.errorMessage || message.content}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-900/40">
                    {onOpenSettings && (
                      <button
                        onClick={onOpenSettings}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-semibold shadow-md hover:shadow-sky-500/20 transition-all cursor-pointer active:scale-95"
                      >
                        <Sliders className="w-3.5 h-3.5 text-sky-200" />
                        <span>Change Model</span>
                      </button>
                    )}
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3 text-zinc-400" />
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');

                      if (!inline && match) {
                        return <CodeBlock language={match[1]} value={codeString} />;
                      } else if (!inline) {
                        return <CodeBlock language="text" value={codeString} />;
                      }

                      return (
                        <code
                          className="bg-zinc-800/90 text-sky-300 px-1.5 py-0.5 rounded text-xs font-mono border border-zinc-700/50"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    p({ children }) {
                      return <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>;
                    },
                    em({ children }) {
                      return <em className="italic text-sky-100/90 font-serif leading-relaxed px-0.5">{children}</em>;
                    },
                    ul({ children }) {
                      return <ul className="list-disc list-inside mb-2.5 space-y-1">{children}</ul>;
                    },
                    ol({ children }) {
                      return <ol className="list-decimal list-inside mb-2.5 space-y-1">{children}</ol>;
                    },
                    blockquote({ children }) {
                      return (
                        <blockquote className="border-l-2 border-sky-500/60 pl-3 my-2.5 italic text-zinc-400">
                          {children}
                        </blockquote>
                      );
                    },
                    a({ href, children }) {
                      if (href?.startsWith('https://mail.google.com/mail/')) {
                        return <EmailDraftButton url={href} />;
                      }
                      return (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                          {children}
                        </a>
                      );
                    },
                    table({ children }) {
                      return (
                        <div className="overflow-x-auto my-3 rounded-lg border border-zinc-800">
                          <table className="w-full text-left text-xs border-collapse">{children}</table>
                        </div>
                      );
                    },
                    th({ children }) {
                      return (
                        <th className="bg-zinc-800/80 px-3 py-2 border-b border-zinc-700 font-semibold text-zinc-300">
                          {children}
                        </th>
                      );
                    },
                    td({ children }) {
                      return <td className="px-3 py-2 border-b border-zinc-800/60 text-zinc-300">{children}</td>;
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>

                  {/* Render extracted canvases as interactive buttons */}
                  {message.canvases && message.canvases.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2 border-t border-zinc-700/50 pt-3">
                      {message.canvases.map((canvas, idx) => (
                        <button
                          key={idx}
                          onClick={() => onOpenCanvas && onOpenCanvas(canvas)}
                          className="flex items-center gap-3 p-3 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 text-sky-100 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-sky-900/80 flex items-center justify-center shrink-0">
                            <Code className="w-4 h-4 text-sky-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold truncate">{canvas.title || 'Interactive Canvas'}</h4>
                            <p className="text-xs text-sky-300/80 mt-0.5 truncate">Click to view and copy output</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Streaming Cursor Indicator */}
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-sky-400 animate-pulse rounded-sm align-middle" />
              )}
            </div>

            {/* Subtitle / Timestamp & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-0.5">
              <span className="text-[10px] text-zinc-500 font-mono">
                Elara • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="flex items-center space-x-2">
                {isLast && !isStreaming && onCompleteResponse && !message.isError && (
                  <button
                    onClick={onCompleteResponse}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-800/60 text-xs font-medium transition-colors shadow-sm"
                    title="Prompt Elara to complete her last response"
                  >
                    <Play className="w-3 h-3 text-sky-400 fill-sky-400/20" />
                    <span>Complete Message</span>
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Copy response"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                {isLast && !isStreaming && onRegenerate && !message.isError && (
                  <button
                    onClick={onRegenerate}
                    className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                    title="Regenerate response"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
