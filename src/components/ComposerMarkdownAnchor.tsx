import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { MarkdownHelpButton } from './MarkdownHelpButton';
import { ChatModelSelector } from './ChatModelSelector';

const TEXTAREA_SELECTOR = 'footer textarea';
const PAPERCLIP_SELECTOR = 'footer button[title="Attach image from gallery or take camera photo"]';

type EditorHostState = {
  textarea: HTMLTextAreaElement | null;
  toolbarHost: HTMLDivElement | null;
};

const setTextareaValue = (textarea: HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
};

const ComposerExpandedEditor: React.FC<{
  textarea: HTMLTextAreaElement;
  onClose: () => void;
}> = ({ textarea, onClose }) => {
  const [value, setValue] = useState(textarea.value);
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    const handleInput = () => setValue(textarea.value);
    textarea.addEventListener('input', handleInput);
    setValue(textarea.value);
    return () => textarea.removeEventListener('input', handleInput);
  }, [textarea]);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
    }, 40);
    return () => window.clearTimeout(focusTimer);
  }, [textarea]);

  const handleChange = (next: string) => {
    setValue(next);
    setTextareaValue(textarea, next);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Expanded message editor"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[82vh] w-[94vw] max-h-[88vh] max-w-6xl flex-col overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950 shadow-2xl sm:h-[76vh] sm:w-[76vw]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/90 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">Expanded Editor</h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">Write, review, and refine your message before sending.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hidden rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-500 sm:inline">
              {value.length.toLocaleString()} chars
            </span>
            <button
              type="button"
              onClick={() => setIsFocused((focused) => !focused)}
              className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              title={isFocused ? 'Leave focus mode' : 'Focus editor'}
              aria-label={isFocused ? 'Leave focus mode' : 'Focus editor'}
            >
              {isFocused ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
              title="Close expanded editor"
              aria-label="Close expanded editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 p-3 sm:p-5">
          <textarea
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder={textarea.placeholder || 'Message Elara...'}
            className="h-full w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-4 text-sm leading-7 text-zinc-100 outline-none placeholder-zinc-600 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/10 sm:px-5 sm:py-5 sm:text-base"
            spellCheck
            autoCapitalize="sentences"
          />
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-900/70 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 sm:text-[11px]">
            <span>Draft stays shared with the normal composer.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-500"
          >
            Done
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export const ComposerMarkdownAnchor: React.FC = () => {
  const [hostState, setHostState] = useState<EditorHostState>({ textarea: null, toolbarHost: null });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    let toolbarHost: HTMLDivElement | null = null;
    let currentPaperclipParent: HTMLElement | null = null;

    const attach = () => {
      const textarea = document.querySelector<HTMLTextAreaElement>(TEXTAREA_SELECTOR);
      const paperclip = document.querySelector<HTMLButtonElement>(PAPERCLIP_SELECTOR);
      const parent = paperclip?.parentElement;
      if (!textarea || !paperclip || !parent) return;
      if (parent === currentPaperclipParent && toolbarHost?.isConnected) {
        if (mounted) setHostState({ textarea, toolbarHost });
        return;
      }

      currentPaperclipParent?.querySelector('[data-elara-composer-tools="true"]')?.remove();
      toolbarHost?.remove();

      toolbarHost = document.createElement('div');
      toolbarHost.dataset.elaraComposerTools = 'true';
      toolbarHost.className = 'ml-0.5 inline-flex items-center gap-0.5';

      paperclip.insertAdjacentElement('afterend', toolbarHost);
      currentPaperclipParent = parent;
      if (mounted) setHostState({ textarea, toolbarHost });
    };

    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    attach();

    return () => {
      mounted = false;
      observer.disconnect();
      toolbarHost?.remove();
      setHostState({ textarea: null, toolbarHost: null });
    };
  }, []);

  const textarea = hostState.textarea;
  const toolbarHost = hostState.toolbarHost;
  if (!toolbarHost || !textarea) return null;

  return (
    <>
      {createPortal(
        <>
          <ChatModelSelector />
          <MarkdownHelpButton inline />
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center justify-center rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-sky-300 transition-colors"
            aria-label="Open expanded message editor"
            title="Expand message editor"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </>,
        toolbarHost,
      )}
      {expanded && <ComposerExpandedEditor textarea={textarea} onClose={() => setExpanded(false)} />}
    </>
  );
};
