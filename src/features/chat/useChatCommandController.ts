import { useEffect } from 'react';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type { Conversation, ElaraSettings, MemoryScratchpadState, Message } from '../../types';
import { generateUniqueId } from '../../lib/storage';

export type ChatCommandControllerArgs = {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeId: string | null;
  settings: ElaraSettings;
  memoryState: MemoryScratchpadState;
  isStreaming: boolean;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  streamAssistantResponse: (conversationId: string, text: string, history: Message[], image?: string) => void;
  abortControllerRef: MutableRefObject<AbortController | null>;
};

type ElaraAskEvent = CustomEvent<{ prompt?: string }>;

export function useChatCommandController({ conversations, activeConversation, activeId, settings, memoryState, isStreaming, setConversations, setActiveId, setIsStreaming, streamAssistantResponse, abortControllerRef }: ChatCommandControllerArgs) {
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    if (activeId) {
      setConversations((prev) => prev.map((c) => c.id === activeId ? { ...c, messages: c.messages.map((m) => m.isStreaming ? { ...m, isStreaming: false } : m) } : c));
    }
  };

  const handleSendMessage = (text: string, image?: string) => {
    let currentConvId = activeId;
    if (!currentConvId) {
      const newConv: Conversation = { id: generateUniqueId('conv'), title: text.slice(0, 30) || (image ? 'Image Attachment' : 'New Conversation'), createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
      setConversations((prev) => [...prev, newConv]);
      setActiveId(newConv.id);
      currentConvId = newConv.id;
    }
    const conv = conversations.find((c) => c.id === currentConvId);
    const existingMessages = conv ? conv.messages : [];
    const userMsg: Message = { id: generateUniqueId('msg_usr'), role: 'user', content: text, image, timestamp: Date.now() };
    setConversations((prev) => prev.map((c) => c.id === currentConvId ? { ...c, updatedAt: Date.now(), messages: [...c.messages, userMsg] } : c));
    streamAssistantResponse(currentConvId, text, existingMessages, image);
  };

  useEffect(() => {
    const handleAsk = (event: Event) => {
      const prompt = (event as ElaraAskEvent).detail?.prompt?.trim();
      if (prompt) handleSendMessage(prompt);
    };
    window.addEventListener('elara:ask', handleAsk);
    return () => window.removeEventListener('elara:ask', handleAsk);
  });

  const handleRegenerate = () => {
    if (!activeConversation || isStreaming) return;
    const msgs = activeConversation.messages;
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) { if (msgs[i].role === 'user') { lastUserIndex = i; break; } }
    if (lastUserIndex === -1) return;
    const lastUserMsg = msgs[lastUserIndex];
    const historyMsgs = msgs.slice(0, lastUserIndex);
    const trimmedMsgs = msgs.slice(0, lastUserIndex + 1);
    setConversations((prev) => prev.map((c) => c.id === activeConversation.id ? { ...c, messages: trimmedMsgs } : c));
    streamAssistantResponse(activeConversation.id, lastUserMsg.content, historyMsgs, lastUserMsg.image);
  };

  const handleEditAndResend = (messageId: string, newContent: string) => {
    if (!activeConversation || isStreaming) return;
    const msgs = activeConversation.messages;
    const targetIndex = msgs.findIndex((m) => m.id === messageId);
    if (targetIndex === -1) return;
    const historyMsgs = msgs.slice(0, targetIndex);
    const targetMsg = msgs[targetIndex];
    const updatedUserMsg: Message = { ...targetMsg, content: newContent, timestamp: Date.now() };
    const trimmedMsgs = [...historyMsgs, updatedUserMsg];
    setConversations((prev) => prev.map((c) => c.id === activeConversation.id ? { ...c, messages: trimmedMsgs } : c));
    streamAssistantResponse(activeConversation.id, newContent, historyMsgs, targetMsg.image);
  };

  const handleCompleteResponse = () => {
    if (!activeConversation || isStreaming) return;
    handleSendMessage("Please continue and complete your last response right from where you left off, without repeating what you've already written.");
  };

  const handleRetry = () => { handleRegenerate(); };

  return { handleStopStreaming, handleSendMessage, handleRegenerate, handleEditAndResend, handleCompleteResponse, handleRetry };
}
