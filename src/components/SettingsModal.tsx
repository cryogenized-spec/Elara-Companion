import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ElaraSettings } from '../types';
import type { VoiceSettings } from '../lib/voiceSettings';
import { DEFAULT_VOICE_SETTINGS, normalizeVoiceSettings } from '../lib/voiceSettings';
import { SettingsModal as LegacySettingsModal } from './SettingsModalLegacy';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';

export interface SettingsModalProps {
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
 * Compatibility bridge for Pass 3.
 * The legacy settings implementation remains responsible for every existing tab,
 * persistence path, exports, and integrations. Only the legacy Voice tab surface
 * is visually replaced by the canonical VoiceSettingsPanel.
 */
const VoicePanelBridge: React.FC<{
  isOpen: boolean;
  value: VoiceSettings;
  onChange: (settings: VoiceSettings) => void;
}> = ({ isOpen, value, onChange }) => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setHost(null);
      return;
    }

    let disposed = false;
    let hiddenContainer: HTMLElement | null = null;
    let overlay: HTMLDivElement | null = null;

    const sync = () => {
      if (disposed) return;

      const marker = Array.from(document.querySelectorAll('span')).find(
        (node) => node.textContent?.trim() === 'Live Speech-to-Text & Voice Dictation',
      );
      const container = marker?.closest('div.space-y-6') as HTMLElement | null;

      if (!container) {
        if (hiddenContainer) {
          hiddenContainer.style.visibility = '';
          hiddenContainer = null;
        }
        if (overlay) {
          overlay.remove();
          overlay = null;
        }
        setHost(null);
        return;
      }

      if (!hiddenContainer) {
        hiddenContainer = container;
        hiddenContainer.style.visibility = 'hidden';
      }

      if (!overlay) {
        overlay = document.createElement('div');
        overlay.setAttribute('data-elara-voice-pass3', 'true');
        overlay.style.position = 'fixed';
        overlay.style.zIndex = '80';
        overlay.style.background = '#121212';
        overlay.style.border = '1px solid #27272a';
        overlay.style.borderRadius = '16px';
        overlay.style.overflow = 'hidden';
        document.body.appendChild(overlay);
        setHost(overlay);
      }

      const rect = container.getBoundingClientRect();
      overlay.style.left = `${rect.left}px`;
      overlay.style.top = `${rect.top}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    sync();

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
      if (hiddenContainer) hiddenContainer.style.visibility = '';
      if (overlay) overlay.remove();
      setHost(null);
    };
  }, [isOpen]);

  if (!host) return null;

  return createPortal(
    <div className="h-full overflow-y-auto p-6 text-sm text-zinc-200 leading-relaxed font-sans custom-scrollbar">
      <VoiceSettingsPanel value={value} onChange={onChange} />
    </div>,
    host,
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() =>
    normalizeVoiceSettings(props.settings.voiceSettings),
  );

  useEffect(() => {
    if (props.isOpen) {
      setVoiceSettings(normalizeVoiceSettings(props.settings.voiceSettings));
    }
  }, [props.isOpen, props.settings.voiceSettings]);

  const handleSaveSettings = (newSettings: ElaraSettings) => {
    props.onSaveSettings({
      ...newSettings,
      voiceSettings: voiceSettings || DEFAULT_VOICE_SETTINGS,
      speechLanguage: voiceSettings.language,
      speechAutoSend: voiceSettings.autoSendOnSilence,
      speechAutoCapitalize: voiceSettings.autoCapitalize,
      speechPauseTimeout: voiceSettings.silenceTimeoutMs,
    });
  };

  return (
    <>
      <LegacySettingsModal {...props} onSaveSettings={handleSaveSettings} />
      <VoicePanelBridge
        isOpen={props.isOpen}
        value={voiceSettings}
        onChange={setVoiceSettings}
      />
    </>
  );
};
