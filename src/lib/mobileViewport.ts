const VIEWPORT_HEIGHT_VAR = '--elara-viewport-height';
export const MOBILE_VIEWPORT_EVENT = 'elara:mobile-viewport-changed';

export interface MobileViewportChangeDetail {
  height: number;
  isKeyboardLikelyOpen: boolean;
}

export function installMobileViewportSync(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const update = () => {
    const viewport = window.visualViewport;
    const height = Math.round(viewport?.height || window.innerHeight);
    const layoutHeight = Math.round(window.innerHeight);
    const isKeyboardLikelyOpen = viewport ? height < layoutHeight - 48 : false;

    document.documentElement.style.setProperty(VIEWPORT_HEIGHT_VAR, `${height}px`);
    window.dispatchEvent(new CustomEvent<MobileViewportChangeDetail>(MOBILE_VIEWPORT_EVENT, {
      detail: { height, isKeyboardLikelyOpen },
    }));
  };

  update();
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  window.addEventListener('resize', update);

  return () => {
    window.visualViewport?.removeEventListener('resize', update);
    window.visualViewport?.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
  };
}
