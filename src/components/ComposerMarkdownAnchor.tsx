import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MarkdownHelpButton } from './MarkdownHelpButton';

export const ComposerMarkdownAnchor: React.FC = () => {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let hostElement: HTMLDivElement | null = null;
    let currentParent: HTMLElement | null = null;

    const attach = () => {
      const textarea = document.querySelector<HTMLTextAreaElement>('footer textarea');
      const parent = textarea?.parentElement;
      if (!parent || parent === currentParent) return;

      currentParent?.querySelector('[data-elara-markdown-anchor="true"]')?.remove();
      hostElement?.remove();

      hostElement = document.createElement('div');
      hostElement.dataset.elaraMarkdownAnchor = 'true';
      hostElement.className = 'absolute left-2 bottom-1 z-10';
      parent.appendChild(hostElement);
      currentParent = parent;
      if (mounted) setHost(hostElement);
    };

    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    attach();

    return () => {
      mounted = false;
      observer.disconnect();
      hostElement?.remove();
      setHost(null);
    };
  }, []);

  return host ? createPortal(<MarkdownHelpButton inline />, host) : null;
};
