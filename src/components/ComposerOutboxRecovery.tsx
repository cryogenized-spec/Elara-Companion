import React, { useEffect, useRef } from 'react';
import {
  createPendingOutgoingRecovery,
  listOutgoingRecoveryEntries,
  markOutgoingConfirmed,
  markOutgoingFailed,
  normalizeRecoveryText,
  type OutgoingRecoveryEntry,
} from '../lib/outgoingRecoveryStorage';

const TEXTAREA_SELECTOR = 'textarea[placeholder*="Message Elara"]';
const SEND_BUTTON_SELECTOR = 'button[title^="Send message"]';
const ACTIVE_CONVERSATION_SELECTOR = '[class*="bg-zinc-800/90"][class*="border-zinc-700/60"]';
const SIDEBAR_MESSAGE_SELECTOR = '[data-elara-message-id]';

function normalizeText(value: string): string {
  return normalizeRecoveryText(value).slice(0, 500);
}

function getConversationFingerprint(): string {
  const active = document.querySelector(ACTIVE_CONVERSATION_SELECTOR)?.textContent || 'New Conversation';
  const firstMessage = document.querySelector(SIDEBAR_MESSAGE_SELECTOR)?.textContent || '';
  return `${normalizeText(active)}::${normalizeText(firstMessage) || 'empty'}`;
}

function getTextarea(): HTMLTextAreaElement | null {
  return document.querySelector<HTMLTextAreaElement>(TEXTAREA_SELECTOR);
}

export const ComposerOutboxRecovery: React.FC = () => {
  const pendingRef = useRef<OutgoingRecoveryEntry[]>([]);

  useEffect(() => {
    let disposed = false;
    let saveInFlight = false;

    const refreshPending = async () => {
      const entries = await listOutgoingRecoveryEntries();
      if (!disposed) pendingRef.current = entries.filter((entry) => entry.status === 'pending');
    };

    const captureSendIntent = async () => {
      if (saveInFlight) return;
      const textarea = getTextarea();
      const content = textarea?.value?.trim() || '';
      if (!content) return;

      saveInFlight = true;
      try {
        const entry = await createPendingOutgoingRecovery({
          content,
          conversationFingerprint: getConversationFingerprint(),
        });
        pendingRef.current = [...pendingRef.current, entry];
      } finally {
        saveInFlight = false;
      }
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest(SEND_BUTTON_SELECTOR) : null;
      if (!target) return;
      void captureSendIntent();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      if (!(event.ctrlKey || event.metaKey || (event.shiftKey === false && document.activeElement?.matches(TEXTAREA_SELECTOR)))) return;
      const textarea = document.activeElement?.closest(TEXTAREA_SELECTOR);
      if (!textarea) return;
      const title = document.querySelector(SEND_BUTTON_SELECTOR)?.getAttribute('title') || '';
      const enterSends = title.includes('(Enter)');
      if (!event.ctrlKey && !event.metaKey && !enterSends) return;
      void captureSendIntent();
    };

    const handleRenderedUserMessage = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; content?: string }>).detail;
      if (!detail?.content) return;
      const normalized = normalizeRecoveryText(detail.content);
      const pending = pendingRef.current.find((entry) => normalizeRecoveryText(entry.content) === normalized);
      if (!pending) return;
      pendingRef.current = pendingRef.current.filter((entry) => entry.id !== pending.id);
      void markOutgoingConfirmed(pending.id, detail.id);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshPending();
    };

    const handlePageHide = () => {
      void refreshPending();
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('elara:user-message-rendered', handleRenderedUserMessage as EventListener);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    void refreshPending();

    return () => {
      disposed = true;
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('elara:user-message-rendered', handleRenderedUserMessage as EventListener);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  return null;
};
