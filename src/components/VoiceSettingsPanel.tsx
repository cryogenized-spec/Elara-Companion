import React from 'react';
import { Check, Mic, RotateCcw, Zap } from 'lucide-react';
import {
  DEFAULT_VOICE_SETTINGS,
  VoiceSettings,
  VOICE_MAX_SILENCE_TIMEOUT_MS,
  VOICE_MIN_SILENCE_TIMEOUT_MS,
  normalizeVoiceSettings,
} from '../lib/voiceSettings';

export type VoicePresetId = 'balanced' | 'conversational' | 'dictation';

interface VoicePreset {
  id: VoicePresetId;
  name: string;
  description: string;
  settings: VoiceSettings;
}

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Everyday voice input with a comfortable 2.5 second pause.',
    settings: { ...DEFAULT_VOICE_SETTINGS },
  },
  {
    id: 'conversational',
    name: 'Fast / Conversational',
    description: 'Quicker turn-taking with a shorter silence window.',
    settings: { ...DEFAULT_VOICE_SETTINGS, silenceTimeoutMs: 1750 },
  },
  {
    id: 'dictation',
    name: 'Deliberate / Dictation',
    description: 'More forgiving pauses for longer spoken passages.',
    settings: { ...DEFAULT_VOICE_SETTINGS, silenceTimeoutMs: 4000 },
  },
];

function matchesPreset(settings: VoiceSettings, preset: VoicePreset): boolean {
  const keys: Array<keyof VoiceSettings> = [
    'language',
    'autoSendOnSilence',
    'autoCapitalize',
    'silenceTimeoutMs',
    'noiseSuppression',
    'echoCancellation',
    'autoGainControl',
  ];
  return keys.every((key) => settings[key] === preset.settings[key]);
}

interface VoiceSettingsPanelProps {
  value: VoiceSettings;
  onChange: (settings: VoiceSettings) => void;
}

export const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({ value, onChange }) => {
  const settings = normalizeVoiceSettings(value);
  const activePreset = VOICE_PRESETS.find((preset) => matchesPreset(settings, preset));
  const update = (patch: Partial<VoiceSettings>) => onChange(normalizeVoiceSettings({ ...settings, ...patch }));
  const applyPreset = (preset: VoicePreset) => onChange(normalizeVoiceSettings({ ...preset.settings, language: settings.language }));
  const reset = () => onChange({ ...DEFAULT_VOICE_SETTINGS });

  return (
    <div className="space-y-5">
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-400" /> Voice & Speech
            </h3>
            <p className="text-[11px] text-zinc-400 mt-1">
              Configure microphone capture and Gemini transcription behaviour. Changes are saved with your normal settings.
            </p>
          </div>
          <button type="button" onClick={reset} className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-[11px] text-zinc-300 transition-colors" title="Reset all voice settings to defaults">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {VOICE_PRESETS.map((preset) => {
            const selected = activePreset?.id === preset.id;
            return (
              <button key={preset.id} type="button" onClick={() => applyPreset(preset)} className={`text-left p-3 rounded-xl border transition-all ${selected ? 'bg-emerald-950/40 border-emerald-500/70 ring-1 ring-emerald-500/30' : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-100">{preset.name}</span>
                  {selected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{preset.description}</p>
                <p className="text-[10px] text-zinc-500 mt-2 font-mono">Pause: {(preset.settings.silenceTimeoutMs / 1000).toFixed(2)}s</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Recognition & Sending</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">Fine-tune how spoken text is completed and inserted.</p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 font-mono">{activePreset ? activePreset.name : 'Custom'}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Language</label>
            <select value={settings.language} onChange={(e) => update({ language: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500">
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="en-ZA">English (South Africa)</option>
              <option value="af-ZA">Afrikaans</option>
              <option value="zu-ZA">isiZulu</option>
              <option value="xh-ZA">isiXhosa</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300">Silence before finishing</label>
              <span className="text-xs font-mono text-emerald-400">{(settings.silenceTimeoutMs / 1000).toFixed(2)}s</span>
            </div>
            <input type="range" min={VOICE_MIN_SILENCE_TIMEOUT_MS} max={VOICE_MAX_SILENCE_TIMEOUT_MS} step="250" value={settings.silenceTimeoutMs} onChange={(e) => update({ silenceTimeoutMs: Number(e.target.value) })} className="w-full accent-emerald-500 cursor-pointer" />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono"><span>0.5s</span><span>2.5s default</span><span>10s</span></div>
            <p className="text-[10px] text-zinc-500 mt-1">Elara waits this long after detected silence before completing the recording.</p>
          </div>
        </div>

        <div className="space-y-2.5">
          <ToggleRow label="Auto-send after silence" description="Automatically send the completed transcript instead of leaving it in the composer." value={settings.autoSendOnSilence} onChange={(checked) => update({ autoSendOnSilence: checked })} accent="emerald" />
          <ToggleRow label="Auto-capitalize transcript" description="Capitalizes the first character before the transcript reaches the composer." value={settings.autoCapitalize} onChange={(checked) => update({ autoCapitalize: checked })} />
        </div>
      </section>

      <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
          <Zap className="w-4 h-4 text-sky-400" />
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Microphone Processing</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">Browser-supported audio capture enhancements passed directly to the microphone stream.</p>
          </div>
        </div>
        <div className="space-y-2.5">
          <ToggleRow label="Noise suppression" description="Reduce steady background noise before audio is sent for Gemini transcription." value={settings.noiseSuppression} onChange={(checked) => update({ noiseSuppression: checked })} />
          <ToggleRow label="Echo cancellation" description="Reduce speaker/audio feedback picked up by the microphone." value={settings.echoCancellation} onChange={(checked) => update({ echoCancellation: checked })} />
          <ToggleRow label="Automatic gain control" description="Let the browser balance microphone input levels automatically." value={settings.autoGainControl} onChange={(checked) => update({ autoGainControl: checked })} />
        </div>
      </section>
    </div>
  );
};

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  accent?: 'emerald' | 'default';
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, value, onChange, accent = 'default' }) => (
  <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
    <div className="min-w-0"><p className="text-xs font-medium text-zinc-200">{label}</p><p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{description}</p></div>
    <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${value ? (accent === 'emerald' ? 'bg-emerald-600' : 'bg-sky-600') : 'bg-zinc-800'}`}>
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);
