import React, { useState } from 'react';
import type { ElaraSettings } from '../types';
import { DEFAULT_VOICE_SETTINGS, normalizeVoiceSettings } from '../lib/voiceSettings';
import { DEFAULT_RELIABILITY_SETTINGS, normalizeReliabilitySettings } from '../lib/reliabilitySettings';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { ChatEditorSettingsPanel } from './ChatEditorSettingsPanel';
import { ReliabilitySettingsPanel } from './ReliabilitySettingsPanel';

export interface VoiceChatSettingsPanelProps { settings: ElaraSettings; onChange: (settings: ElaraSettings) => void; }

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} role="switch" aria-checked={checked} className="flex w-full items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-left transition-colors hover:border-zinc-700">
    <span className="min-w-0"><span className="block text-sm font-medium text-zinc-100">{label}</span><span className="mt-1 block text-xs leading-5 text-zinc-500">{description}</span></span>
    <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${checked ? 'border-[#d4af37] bg-[#d4af37]/80' : 'border-zinc-700 bg-zinc-800'}`}><span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} /></span>
  </button>;
}

export const VoiceChatSettingsPanel: React.FC<VoiceChatSettingsPanelProps> = ({ settings, onChange }) => {
  const [section, setSection] = useState<'voice' | 'chat' | 'reliability' | 'google'>('voice');
  const update = (patch: Partial<ElaraSettings>) => onChange({ ...settings, ...patch });
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
          {([
            ['voice', 'Voice Input'], ['chat', 'Chat & Editor'], ['reliability', 'Reliability'], ['google', 'Google'],
          ] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setSection(id)} className={`rounded-lg px-2 py-2 text-[11px] font-medium transition-colors ${section === id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}>{label}</button>)}
        </div>
      </section>
      {section === 'voice' && <VoiceSettingsPanel value={normalizeVoiceSettings(settings.voiceSettings || DEFAULT_VOICE_SETTINGS)} onChange={(voiceSettings) => update({ voiceSettings })} />}
      {section === 'chat' && <ChatEditorSettingsPanel />}
      {section === 'reliability' && <ReliabilitySettingsPanel settings={normalizeReliabilitySettings(settings.reliabilitySettings || DEFAULT_RELIABILITY_SETTINGS)} preferredModel={settings.model} onApply={(reliabilitySettings) => update({ reliabilitySettings })} embedded />}
      {section === 'google' && <section className="space-y-3"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">Connection</p><h3 className="mt-1 text-lg font-semibold text-white">Google account</h3><p className="mt-1 text-sm text-white/50">Keep Elara connected between app sessions when Google has already granted access.</p></div><Toggle label="Stay connected" description="On startup, Elara will quietly reacquire a fresh Google access token when previously authorized. It never stores the access token itself." checked={settings.googleStayConnected !== false} onChange={(checked) => update({ googleStayConnected: checked })} /></section>}
    </div>
  );
};
