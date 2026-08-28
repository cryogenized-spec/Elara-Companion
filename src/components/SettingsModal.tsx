import React, { useEffect, useRef } from 'react';
import { LegacySettingsModal } from './LegacySettingsModal';
import type { ElaraSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ElaraSettings;
  onSaveSettings: (newSettings: ElaraSettings) => void;
  customPortrait: string | null;
  onUploadPortrait: (base64Img: string) => void;
  onRemovePortrait: () => void;
  onExportAllData: () => void;
  onImportData: (jsonStr: string) => void;
  onClearAllData: () => void;
}

/**
 * Canonical application Settings entry point.
 *
 * Google Workspace is intentionally not exposed from Settings; its user-facing
 * surface is the dedicated Google Hub. The historical settings implementation
 * is retained under LegacySettingsModal solely to preserve unrelated settings
 * behavior during migration.
 */
export const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.isOpen || !hostRef.current) return;
    const host = hostRef.current;
    const hideLegacyGoogleTab = () => {
      host.querySelectorAll('button').forEach((button) => {
        const label = button.textContent?.trim().toLowerCase();
        if (label === 'workspace' || label === 'google workspace') {
          button.style.display = 'none';
          button.setAttribute('aria-hidden', 'true');
          button.setAttribute('tabindex', '-1');
        }
      });
    };
    hideLegacyGoogleTab();
    const observer = new MutationObserver(hideLegacyGoogleTab);
    observer.observe(host, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [props.isOpen]);

  return <div ref={hostRef}>{props.isOpen && <LegacySettingsModal {...props} />}</div>;
};
