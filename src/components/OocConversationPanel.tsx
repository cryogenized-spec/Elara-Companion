import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, RefreshCw, Send, X } from 'lucide-react';
import {
  appendOocMessage,
  loadOocConversations,
  loadOocSettings,
  loadOocThreads,
  streamOocResponse,
  type OocMessage,
} from '../services/oocConversationService';
import type { Conversation } from '../types';

export const OocConversationPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [parentConversationId, setParentConversationId] = useState('');
  const [messages, setMessages] = useState<OocMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshConversations = async () => {
    const loaded = await loadOocConversations();
    setConversations(loaded);
    if (!parentConversationId && loaded.length > 0) {
      setParentConversationId(loaded[0].id);
    }
  };

  useEffect(() => {
    void refreshConversations();
  }, []);

  useEffect(() => {
    const threads = loadOocThreads();
    setMessages(parentConversationId ? (threads[parentConversationId] || []) : []);
  }, [parentConversationId]);

  const parentConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === parentConversationId) || null,
    [conversations, parentConversationId],
  );

  const persistAndSet = (message: OocMessage) => {
    const next = appendOocMessage(parentConversationId, message);
    setMessages(next);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy || !parentConversationId) return;

    setError(null);
    setInput('');
    const userMessage: OocMessage = {
      id: `ooc_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    persistAndSet(userMessage);
    setBusy(true);

    try {
      const settings = await loadOocSettings();
      if (!settings.apiKey?.trim()) {
        throw new Error('Add your Gemini API key in Settings before using OOC chat on GitHub Pages.');
      }

      const roleplayContext = (parentConversation?.messages || [])
        .slice(-24)
        .map((message) => `${message.role === 'user' ? 'USER' : 'ELARA'}: ${message.content}`)
        .join('\n\n');

      const history = messages.slice(-20);
      let responseText = '';
      await streamOocResponse({
        settings,
        roleplayContext,
        history,
        message: text,
        onComplete: (content) => {
          responseText = content;
        },
      });

      persistAndSet({
        id: `ooc_${Date.now()}_a`,
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OOC response failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-[4.35rem] left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-950/90 text-zinc-300 text-[11px] font-semibold tracking-wide shadow-lg backdrop-blur-md hover:bg-zinc-900 hover:text-white transition-colors"
        title="Open out-of-character discussion"
      >
        OOC
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm p-3 sm:p-5 flex items-start justify-center">
      <section className="w-full max-w-3xl mt-2 sm:mt-6 h-[calc(100dvh-1.5rem)] sm:h-[calc(100dvh-3rem)] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900/70 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-sky-400" />
              <h2 className="font-semibold text-sm">Out of Character</h2>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Meta discussion with Elara. Her identity and system prompt remain active.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="p-2.5 rounded-lg hover:bg-zinc-800 text-zinc-400" aria-label="Close OOC chat">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2">
            <label htmlFor="ooc-parent" className="text-[11px] text-zinc-500 shrink-0">Roleplay thread</label>
            <select id="ooc-parent" value={parentConversationId} onChange={(event) => setParentConversationId(event.target.value)} className="min-w-0 flex-1 rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-2 text-xs text-zinc-200 outline-none focus:border-sky-500/50">
              {conversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title || 'Untitled conversation'}</option>)}
            </select>
            <button type="button" onClick={() => void refreshConversations()} className="p-2.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400" title="Refresh roleplay threads">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center px-6">
              <div>
                <MessageCircle className="w-8 h-8 mx-auto text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-400">Discuss the scene, characters, continuity, ideas, or anything else about the roleplay here.</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`max-w-[92%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed whitespace-pre-wrap ${message.role === 'user' ? 'ml-auto bg-sky-950/60 border border-sky-800/60 text-sky-50' : 'mr-auto bg-zinc-900 border border-zinc-800 text-zinc-200'}`}>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{message.role === 'user' ? 'You' : 'Elara · OOC'}</div>
                {message.content}
              </div>
            ))
          )}
          {busy && <div className="mr-auto rounded-2xl px-3.5 py-3 bg-zinc-900 border border-zinc-800 text-xs text-zinc-500">Elara is considering the discussion…</div>}
        </div>

        {error && <div className="px-4 py-2.5 border-t border-red-900/40 bg-red-950/30 text-xs text-red-300">{error}</div>}

        <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="border-t border-zinc-800 bg-zinc-900/60 p-3 flex gap-2 shrink-0">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder="Discuss the roleplay with Elara…"
            className="min-h-[48px] flex-1 resize-none rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-sky-500/50"
          />
          <button type="submit" disabled={busy || !input.trim() || !parentConversationId} className="self-end p-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white" aria-label="Send OOC message">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </section>
    </div>
  );
};
