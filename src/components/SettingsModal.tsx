import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ElaraSettings } from '../types';
import type { VoiceSettings } from '../lib/voiceSettings';
import { DEFAULT_VOICE_SETTINGS, normalizeVoiceSettings } from '../lib/voiceSettings';
import type { ReliabilitySettings } from '../lib/reliabilitySettings';
import { DEFAULT_RELIABILITY_SETTINGS, normalizeReliabilitySettings } from '../lib/reliabilitySettings';
import { SettingsModal as LegacySettingsModal } from './SettingsModalLegacy';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { ReliabilitySettingsPanel } from './ReliabilitySettingsPanel';
import { ChatEditorSettingsPanel } from './ChatEditorSettingsPanel';

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

const VoicePanelBridge: React.FC<{
  isOpen: boolean;
  voiceValue: VoiceSettings;
  reliabilityValue: ReliabilitySettings;
  preferredModel: string;
  onVoiceChange: (settings: VoiceSettings) => void;
  onReliabilityChange: (settings: ReliabilitySettings) => void;
}> = ({ isOpen, voiceValue, reliabilityValue, preferredModel, onVoiceChange, onReliabilityChange }) => {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [section, setSection] = useState<'voice' | 'chat' | 'reliability'>('voice');
  const autoSelectedVoiceRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setHost(null);
      setSection('voice');
      autoSelectedVoiceRef.current = false;
      return;
    }

    let disposed = false;
    let hiddenContainer: HTMLElement | null = null;
    let overlay: HTMLDivElement | null = null;

    const removeOverlay = () => {
      if (hiddenContainer) {
        hiddenContainer.style.visibility = '';
        hiddenContainer = null;
      }
      if (overlay) {
        overlay.remove();
        overlay = null;
      }
      setHost(null);
    };

    const findLegacyVoiceButton = () => {
      return Array.from(document.querySelectorAll('button')).find((node) => {
        if (node.closest('[data-elara-unified-settings="true"]')) return false;
        const text = node.textContent?.replace(/\s+/g, ' ').trim();
        return text === 'Voice & Speech' || text === 'Voice & Chat';
      }) as HTMLButtonElement | undefined;
    };

    const ensureLegacyVoiceTab = () => {
      const voiceButton = findLegacyVoiceButton();
      if (voiceButton) {
        const label = Array.from(voiceButton.querySelectorAll('span')).find(
          (node) => node.textContent?.trim() === 'Voice & Speech',
        );
        if (label) label.textContent = 'Voice & Chat';
      }
      return voiceButton;
    };

    const sync = () => {
      if (disposed) return;

      const marker = Array.from(document.querySelectorAll('span')).find(
        (node) => node.textContent?.trim() === 'Live Speech-to-Text & Voice Dictation',
      );

      if (!marker) {
        const voiceButton = ensureLegacyVoiceTab();
        if (!autoSelectedVoiceRef.current && voiceButton) {
          autoSelectedVoiceRef.current = true;
          voiceButton.click();
          return;
        }
        removeOverlay();
        return;
      }

      const container = marker.closest('div.space-y-6') as HTMLElement | null;
      if (!container) {
        removeOverlay();
        return;
      }

      if (!hiddenContainer) {
        hiddenContainer = container;
        hiddenContainer.style.visibility = 'hidden';
      }

      if (!overlay) {
        overlay = document.createElement('div');
        overlay.setAttribute('data-elara-unified-settings', 'true');
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
      ensureLegacyVoiceTab();
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
      removeOverlay();
    };
  }, [isOpen]);

  if (!host) return null;

  return createPortal(
    <div className="flex h-full min-h-0 flex-col text-sm text-zinc-200 leading-relaxed font-sans">
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/70 px-4 py-3">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
          {([
            ['voice', 'Voice & Speech'],
            ['chat', 'Chat & Editor'],
            ['reliability', 'Reliability'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`rounded-lg px-2 py-2 text-[11px] font-medium transition-colors ${section === id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
        {section === 'voice' && <VoiceSettingsPanel value={voiceValue} onChange={onVoiceChange} />}
        {section === 'chat' && <ChatEditorSettingsPanel />}
        {section === 'reliability' && (
          <ReliabilitySettingsPanel
            settings={reliabilityValue}
            preferredModel={preferredModel}
            onApply={onReliabilityChange}
            embedded
          />
        )}
      </div>
    </div>,
    host,
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => normalizeVoiceSettings(props.settings.voiceSettings));
  const [reliabilitySettings, setReliabilitySettings] = useState<ReliabilitySettings>(() => normalizeReliabilitySettings(props.settings.reliabilitySettings));

  useEffect(() => {
    if (props.isOpen) {
      setVoiceSettings(normalizeVoiceSettings(props.settings.voiceSettings));
      setReliabilitySettings(normalizeReliabilitySettings(props.settings.reliabilitySettings));
    }
  }, [props.isOpen, props.settings.voiceSettings, props.settings.reliabilitySettings]);

  const handleSaveSettings = (newSettings: ElaraSettings) => {
    props.onSaveSettings({
      ...newSettings,
      voiceSettings: voiceSettings || DEFAULT_VOICE_SETTINGS,
      reliabilitySettings: reliabilitySettings || DEFAULT_RELIABILITY_SETTINGS,
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
        voiceValue={voiceSettings}
        reliabilityValue={reliabilitySettings}
        preferredModel={props.settings.model}
        onVoiceChange={setVoiceSettings}
        onReliabilityChange={setReliabilitySettings}
      />
    </>
  );
};
