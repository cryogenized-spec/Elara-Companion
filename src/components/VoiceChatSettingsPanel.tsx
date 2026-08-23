import React, { useState } from 'react';
import type { ElaraSettings } from '../types';
import { DEFAULT_VOICE_SETTINGS, normalizeVoiceSettings } from '../lib/voiceSettings';
import { DEFAULT_RELIABILITY_SETTINGS, normalizeReliabilitySettings } from '../lib/reliabilitySettings';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { ChatEditorSettingsPanel } from './ChatEditorSettingsPanel';
import { ReliabilitySettingsPanel } from './ReliabilitySettingsPanel';

export interface VoiceChatSettingsPanelProps {
  settings: ElaraSettings;
  onChange: (settings: ElaraSettings) => void;
}

export const VoiceChatSettingsPanel: React.FC<VoiceChatSettingsPanelProps> = ({ settings, onChange }) => {
  const [section, setSection] = useState<'voice' | 'chat' | 'reliability'>('voice');

  const update = (patch: Partial<ElaraSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
          {([
            ['voice', 'Voice Input'],
            ['chat', 'Chat & Editor'],
            ['reliability', 'Reliability'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`rounded-lg px-2 py-2 text-[11px] font-medium transition-colors ${
                section === id
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {section === 'voice' && (
        <VoiceSettingsPanel
          value={normalizeVoiceSettings(settings.voiceSettings || DEFAULT_VOICE_SETTINGS)}
          onChange={(voiceSettings) => update({ voiceSettings })}
        />
      )}

      {section === 'chat' && <ChatEditorSettingsPanel />}

      {section === 'reliability' && (
        <ReliabilitySettingsPanel
          settings={normalizeReliabilitySettings(settings.reliabilitySettings || DEFAULT_RELIABILITY_SETTINGS)}
          preferredModel={settings.model}
          onApply={(reliabilitySettings) => update({ reliabilitySettings })}
          embedded
        />
      )}
    </div>
  );
};
