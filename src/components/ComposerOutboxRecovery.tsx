import React, { useEffect, useRef } from 'react';
import {
  createPendingOutgoingRecovery,
  listOutgoingRecoveryEntries,
  markOutgoingConfirmed,
  normalizeRecoveryText,
  type OutgoingRecoveryEntry,
} from '../lib/outgoingRecoveryStorage';

const TEXTAREA_SELECTOR = 'textarea[placeholder*="Message Elara"]';
const SEND_BUTTON_SELECTOR = 'button[title^="Send message"]';
const ACTIVE_CONVERSATION_SELECTOR = '[class*="bg-zinc-800/90"][class*="border-zinc-700/60"]';

function normalizeText(value: string): string {
  return normalizeRecoveryText(value).slice(0, 500);
}

function getConversationFingerprint(): string {
  const active = document.querySelector(ACTIVE_CONVERSATION_SELECTOR)?.textContent || 'New Conversation';
  return normalizeText(active);
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
      const active = document.activeElement;
      if (!(active instanceof HTMLTextAreaElement) || !active.matches(TEXTAREA_SELECTOR)) return;

      const title = document.querySelector(SEND_BUTTON_SELECTOR)?.getAttribute('title') || '';
      const enterSends = title.includes('(Enter)');
      const shouldSend = enterSends ? !event.shiftKey : event.ctrlKey || event.metaKey;
      if (!shouldSend) return;
      void captureSendIntent();
    };

    const handleRenderedUserMessage = async (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; content?: string }>).detail;
      if (!detail?.content) return;

      const normalized = normalizeRecoveryText(detail.content);
      const entries = await listOutgoingRecoveryEntries();
      if (disposed) return;

      const existing = entries.find((entry) =>
        entry.status === 'confirmed' &&
        entry.messageId === detail.id,
      );
      if (existing) return;

      const pending = entries.find((entry) =>
        entry.status === 'pending' &&
        normalizeRecoveryText(entry.content) === normalized,
      );

      if (pending) {
        pendingRef.current = pendingRef.current.filter((entry) => entry.id !== pending.id);
        await markOutgoingConfirmed(pending.id, detail.id);
        return;
      }

      const confirmed = await createPendingOutgoingRecovery({
        content: detail.content,
        conversationFingerprint: getConversationFingerprint(),
      });
      await markOutgoingConfirmed(confirmed.id, detail.id);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshPending();
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('elara:user-message-rendered', handleRenderedUserMessage as EventListener);
    document.addEventListener('visibilitychange', handleVisibility);
    void refreshPending();

    return () => {
      disposed = true;
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('elara:user-message-rendered', handleRenderedUserMessage as EventListener);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return null;
};
