import React, { useEffect, useRef } from 'react';
import { loadComposerDraft, saveComposerDraft, clearComposerDraft } from '../lib/composerDraftStorage';

const TEXTAREA_SELECTOR = 'textarea[placeholder*="Message Elara"]';
const SIDEBAR_ACTIVE_SELECTOR = '[class*="bg-zinc-800/90"][class*="border-zinc-700/60"]';
const MESSAGE_SELECTOR = '.w-full.py-2.5.transition-colors';
const SAVE_DEBOUNCE_MS = 350;
const DRAFT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function getConversationFingerprint(): string {
  if (typeof document === 'undefined') return 'default';

  const activeConversationTitle = normalizeText(
    document.querySelector(SIDEBAR_ACTIVE_SELECTOR)?.textContent || 'New Conversation'
  );
  const firstMessage = normalizeText(
    document.querySelector(MESSAGE_SELECTOR)?.textContent || ''
  );

  return `${activeConversationTitle}::${firstMessage || 'empty'}`;
}

export const ComposerDraftRecovery: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fingerprintRef = useRef<string>('');
  const saveTimerRef = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    let disposed = false;

    const persist = (fingerprint: string, content: string) => {
      if (!fingerprint) return;
      void saveComposerDraft(fingerprint, content);
    };

    const scheduleSave = (content: string) => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        persist(fingerprintRef.current, content);
      }, SAVE_DEBOUNCE_MS);
    };

    const restoreDraft = async (textarea: HTMLTextAreaElement, fingerprint: string) => {
      const draft = await loadComposerDraft(fingerprint);
      if (disposed || textareaRef.current !== textarea) return;

      if (!draft || Date.now() - draft.updatedAt > DRAFT_MAX_AGE_MS) {
        if (draft) await clearComposerDraft(fingerprint);
        return;
      }

      if (textarea.value.trim()) return;

      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      setter?.call(textarea, draft.content);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const attach = () => {
      const textarea = document.querySelector<HTMLTextAreaElement>(TEXTAREA_SELECTOR);
      if (!textarea || textarea === textareaRef.current) return;

      textareaRef.current = textarea;
      fingerprintRef.current = getConversationFingerprint();
      void restoreDraft(textarea, fingerprintRef.current);

      const handleInput = () => {
        scheduleSave(textarea.value);
      };
      textarea.addEventListener('input', handleInput);

      const cleanupTextarea = () => {
        textarea.removeEventListener('input', handleInput);
        if (textareaRef.current === textarea) textareaRef.current = null;
      };

      textarea.dataset.elaraDraftCleanup = 'true';
      (textarea as HTMLTextAreaElement & { __elaraDraftCleanup?: () => void }).__elaraDraftCleanup = cleanupTextarea;
    };

    const checkConversation = () => {
      const textarea = textareaRef.current;
      if (!textarea) {
        attach();
        return;
      }

      const nextFingerprint = getConversationFingerprint();
      if (!nextFingerprint || nextFingerprint === fingerprintRef.current) return;

      const previousFingerprint = fingerprintRef.current;
      const currentContent = textarea.value;
      if (currentContent) persist(previousFingerprint, currentContent);

      fingerprintRef.current = nextFingerprint;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      setter?.call(textarea, '');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      void restoreDraft(textarea, nextFingerprint);
    };

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      checkConversation();
      const textarea = textareaRef.current;
      if (textarea) persist(fingerprintRef.current, textarea.value);
    };

    const handlePageHide = () => {
      const textarea = textareaRef.current;
      if (textarea) persist(fingerprintRef.current, textarea.value);
    };

    const interval = window.setInterval(checkConversation, 500);
    observerRef.current = new MutationObserver(checkConversation);
    observerRef.current.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    attach();

    return () => {
      disposed = true;
      window.clearInterval(interval);
      observerRef.current?.disconnect();
      observerRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);

      const textarea = textareaRef.current;
      const cleanup = (textarea as (HTMLTextAreaElement & { __elaraDraftCleanup?: () => void }) | null)?.__elaraDraftCleanup;
      cleanup?.();
    };
  }, []);

  return null;
};
