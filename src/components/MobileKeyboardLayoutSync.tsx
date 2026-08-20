import { useEffect } from 'react';
import { MOBILE_VIEWPORT_EVENT, type MobileViewportChangeDetail } from '../lib/mobileViewport';

const CHAT_FEED_SELECTOR = '.touch-scroll';
const BOTTOM_TOLERANCE_PX = 120;

function scrollChatFeedToBottom(behavior: ScrollBehavior = 'auto'): void {
  const feed = document.querySelector<HTMLElement>(CHAT_FEED_SELECTOR);
  if (!feed) return;
  feed.scrollTo({ top: feed.scrollHeight, behavior });
}

export function MobileKeyboardLayoutSync(): null {
  useEffect(() => {
    const handleViewportChange = (event: Event) => {
      const detail = (event as CustomEvent<MobileViewportChangeDetail>).detail;
      if (!detail?.isKeyboardLikelyOpen) return;

      const feed = document.querySelector<HTMLElement>(CHAT_FEED_SELECTOR);
      if (!feed) return;

      const wasNearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight <= BOTTOM_TOLERANCE_PX;
      if (!wasNearBottom) return;

      // Let the visual viewport height and flex layout settle before restoring the bottom edge.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollChatFeedToBottom('auto'));
      });
    };

    window.addEventListener(MOBILE_VIEWPORT_EVENT, handleViewportChange);
    return () => window.removeEventListener(MOBILE_VIEWPORT_EVENT, handleViewportChange);
  }, []);

  return null;
}
