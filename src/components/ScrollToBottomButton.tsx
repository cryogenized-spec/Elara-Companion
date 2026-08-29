import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';

interface ScrollToBottomButtonProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const BOTTOM_THRESHOLD_PX = 24;
const STATIC_DELAY_MS = 250;

function isAtBottom(element: HTMLDivElement): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_THRESHOLD_PX;
}

export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({ scrollContainerRef }) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const updateFromPosition = () => {
      const atBottom = isAtBottom(element);
      if (atBottom) {
        setVisible(false);
      } else {
        setVisible(true);
      }
    };

    updateFromPosition();

    const observer = new ResizeObserver(updateFromPosition);
    observer.observe(element);
    if (element.firstElementChild instanceof HTMLElement) observer.observe(element.firstElementChild);

    return () => observer.disconnect();
  }, [scrollContainerRef]);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const handleScroll = () => {
      setVisible(false);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (!isAtBottom(element)) setVisible(true);
      }, STATIC_DELAY_MS);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [scrollContainerRef]);

  const handleClick = () => {
    const element = scrollContainerRef.current;
    if (!element) return;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    setVisible(false);
  };

  return (
    <button
      type="button"
      aria-label="Jump to latest message"
      title="Jump to latest message"
      onClick={handleClick}
      className={`absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-400/60 bg-[#14110a]/95 p-2.5 text-amber-300 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-200 hover:border-amber-300 hover:bg-[#1a160b] hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
    >
      <ArrowDown className="h-4 w-4" strokeWidth={2.25} />
      <span className="sr-only">Jump to latest message</span>
    </button>
  );
};
