import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AVAILABLE_MODELS, ElaraSettings, PersonaSnapshot } from '../types';
import { settingsPersistence } from '../services/settingsPersistenceService';
import { DEFAULT_ELARA_SYSTEM_PROMPT, DEFAULT_PERSONA_PROTOCOL, DEFAULT_INTIMACY_MODULE, DEFAULT_RUNTIME_RULES } from '../constants/defaultPrompt';
import { DEFAULT_ELARA_PORTRAIT } from '../constants/defaultPortrait';
import { VoiceChatSettingsPanel } from './VoiceChatSettingsPanel';

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

type SettingsTab = 'persona' | 'visuals' | 'voice' | 'system' | 'data';
const tabs: readonly { id: SettingsTab; label: string; description: string }[] = [
  { id: 'persona', label: 'Persona', description: 'Identity, model, and runtime tuning' },
  { id: 'visuals', label: 'Visuals', description: 'Portrait, typography, and display' },
  { id: 'voice', label: 'Voice & Chat', description: 'Voice, editor, reliability' },
  { id: 'system', label: 'System', description: 'Prompts and runtime controls' },
  { id: 'data', label: 'Data', description: 'Export, import, and reset' },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20';
const buttonClass = 'rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/75 hover:bg-white/[0.07]';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSaveSettings, customPortrait, onUploadPortrait, onRemovePortrait, onExportAllData, onImportData, onClearAllData }) => {
  const [formData, setFormData] = useState<ElaraSettings>(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('visuals');
  const [snapshots, setSnapshots] = useState<PersonaSnapshot[]>([]);
  const [snapshotName, setSnapshotName] = useState('');
  const [showSnapshotPrompt, setShowSnapshotPrompt] = useState(false);
  const [showPromptResetConfirm, setShowPromptResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const backdropInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setFormData(settings), [settings]);
  useEffect(() => { if (isOpen) settingsPersistence.loadPersonaSnapshots().then(setSnapshots).catch(() => setSnapshots([])); }, [isOpen]);

  const modelOptions = useMemo(() => AVAILABLE_MODELS, []);
  const activePortraitImage = customPortrait || DEFAULT_ELARA_PORTRAIT;
  const update = (patch: Partial<ElaraSettings>) => setFormData(prev => ({ ...prev, ...patch }));

  const handleSaveSnapshot = async () => {
    if (!snapshotName.trim()) return;
    const snapshot: PersonaSnapshot = { id: `snap_${Date.now()}`, name: snapshotName.trim(), timestamp: Date.now(), systemPrompt: formData.systemPrompt, personaProtocol: formData.personaProtocol, intimacyModule: formData.intimacyModule, runtimeRules: formData.runtimeRules, adultFictionEnabled: formData.adultFictionEnabled, adultFictionModule: formData.adultFictionModule };
    const next = [snapshot, ...snapshots];
    setSnapshots(next);
    await settingsPersistence.savePersonaSnapshots(next);
    setSnapshotName('');
    setShowSnapshotPrompt(false);
  };

  const loadSnapshot = (snapshot: PersonaSnapshot) => update({ systemPrompt: snapshot.systemPrompt, personaProtocol: snapshot.personaProtocol, intimacyModule: snapshot.intimacyModule, runtimeRules: snapshot.runtimeRules, adultFictionEnabled: snapshot.adultFictionEnabled, adultFictionModule: snapshot.adultFictionModule });
  const deleteSnapshot = async (id: string) => { const next = snapshots.filter(snapshot => snapshot.id !== id); setSnapshots(next); await settingsPersistence.savePersonaSnapshots(next); };

  const handlePortraitFile = async (file?: File) => { if (!file) return; try { onUploadPortrait(await readFileAsDataUrl(file)); setStatus('Portrait updated.'); } catch { setStatus('Unable to load the portrait image.'); } };
  const handleBackdropFile = async (file?: File) => { if (!file) return; try { update({ backdropImage: await readFileAsDataUrl(file) }); setStatus('Backdrop selected. Save to apply it.'); } catch { setStatus('Unable to load the backdrop image.'); } };
  const handleImportFile = async (file?: File) => { if (!file) return; try { onImportData(await file.text()); setStatus('Import submitted.'); } catch { setStatus('Unable to import that file.'); } };
  const handleResetPrompt = () => { update({ systemPrompt: DEFAULT_ELARA_SYSTEM_PROMPT, personaProtocol: DEFAULT_PERSONA_PROTOCOL, intimacyModule: DEFAULT_INTIMACY_MODULE, runtimeRules: DEFAULT_RUNTIME_RULES }); setShowPromptResetConfirm(false); };
  const handleSave = () => { onSaveSettings(formData); onClose(); };

  if (!isOpen) return null;

  const thinkingBudget = formData.thinkingBudget ?? 4096;
  const textBackground = formData.textBackground || 'slate';

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-4" role="dialog" aria-modal="true" aria-label="Settings">
    <div className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#d4af37]/70 bg-[#0b0b0b] text-white shadow-2xl shadow-black/50">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4"><div><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Elara</p><h2 className="mt-1 text-xl font-semibold">Settings</h2><p className="mt-1 text-sm text-white/50">Personalization, appearance, voice, system behavior, and data.</p></div><button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 hover:bg-white/[0.06]">Close</button></header>
      <nav className="shrink-0 border-b border-white/10 px-3 py-3" aria-label="Settings sections">
        <div className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory [scrollbar-width:thin]">
          {tabs.map(tab => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 snap-start rounded-xl border px-4 py-3 text-left transition ${activeTab === tab.id ? 'border-[#d4af37] bg-[#d4af37]/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/75 hover:border-white/20 hover:bg-white/[0.05]'}`}><span className="block whitespace-nowrap text-sm font-medium">{tab.label}</span><span className="mt-0.5 block whitespace-nowrap text-[11px] leading-4 text-white/40">{tab.description}</span></button>)}
        </div>
        <span className="sr-only">Google services live in Google Hub.</span>
      </nav>
      <main className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {activeTab === 'persona' && <section className="space-y-5"><SectionTitle title="Persona & Runtime" description="Identity, model selection, API routing, and response behavior."/><div className="grid gap-4 sm:grid-cols-2"><Field label="Your name"><input value={formData.userName} onChange={e => update({ userName: e.target.value })} className={inputClass}/></Field><Field label="Timezone"><input value={formData.timezone} onChange={e => update({ timezone: e.target.value })} className={inputClass}/></Field></div><Field label="Model"><select value={formData.model} onChange={e => update({ model: e.target.value })} className={inputClass}>{modelOptions.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></Field><Field label="Gemini API key"><input type="password" value={formData.apiKey || ''} onChange={e => update({ apiKey: e.target.value })} placeholder="Stored in your existing app settings" className={inputClass}/></Field><Field label="Custom backend URL"><input value={formData.customBackendUrl || ''} onChange={e => update({ customBackendUrl: e.target.value })} placeholder="Optional custom runtime endpoint" className={inputClass}/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Temperature"><input type="number" min="0" max="2" step="0.05" value={formData.temperature} onChange={e => update({ temperature: Number(e.target.value) })} className={inputClass}/></Field><Field label="Max output tokens"><input type="number" min="256" max="8192" step="256" value={formData.maxOutputTokens} onChange={e => update({ maxOutputTokens: Number(e.target.value) })} className={inputClass}/></Field><Field label="Top P"><input type="number" min="0" max="1" step="0.05" value={formData.topP} onChange={e => update({ topP: Number(e.target.value) })} className={inputClass}/></Field><Field label="Top K"><input type="number" min="1" max="100" step="1" value={formData.topK} onChange={e => update({ topK: Number(e.target.value) })} className={inputClass}/></Field></div><Field label="Thinking budget"><input type="range" min="0" max="16384" step="512" value={thinkingBudget} onChange={e => update({ thinkingBudget: Number(e.target.value) })} className="w-full"/><p className="mt-1 text-xs text-white/40">{thinkingBudget.toLocaleString()} reasoning tokens</p></Field><Toggle label="Include conversation history" checked={Boolean(formData.includeHistory)} onChange={checked => update({ includeHistory: checked })}/><button type="button" onClick={() => setShowSnapshotPrompt(true)} className={buttonClass}>Save persona snapshot</button>{showSnapshotPrompt && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><input autoFocus value={snapshotName} onChange={e => setSnapshotName(e.target.value)} placeholder="Snapshot name" className={inputClass}/><div className="mt-3 flex gap-2"><button type="button" onClick={() => void handleSaveSnapshot()} className={buttonClass}>Save</button><button type="button" onClick={() => setShowSnapshotPrompt(false)} className={buttonClass}>Cancel</button></div></div>}{snapshots.length > 0 && <div className="space-y-2"><p className="text-sm font-medium">Saved snapshots</p>{snapshots.map(snapshot => <div key={snapshot.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm">{snapshot.name}</p><p className="text-xs text-white/35">{new Date(snapshot.timestamp).toLocaleString()}</p></div><button type="button" onClick={() => loadSnapshot(snapshot)} className={buttonClass}>Load</button><button type="button" onClick={() => void deleteSnapshot(snapshot.id)} className={buttonClass}>Delete</button></div>)}</div>}</section>}

          {activeTab === 'visuals' && <section className="space-y-5"><SectionTitle title="Visuals" description="Portrait, backdrop, typography, and message surface controls."/><div className="grid gap-5 lg:grid-cols-2"><div className="space-y-4"><Field label="Portrait scale"><input type="range" min="0.5" max="3" step="0.1" value={formData.portraitScale} onChange={e => update({ portraitScale: Number(e.target.value) })} className="w-full"/></Field><Field label="Theme"><select value={formData.themeMode || formData.theme} onChange={e => update({ themeMode: e.target.value as ElaraSettings['themeMode'], theme: e.target.value === 'light' ? 'light' : 'dark' })} className={inputClass}><option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option></select></Field><Field label="Message text size"><input type="range" min="10" max="20" step="1" value={formData.fontSize ?? 14} onChange={e => update({ fontSize: Number(e.target.value) })} className="w-full"/><p className="mt-1 text-xs text-white/40">{formData.fontSize ?? 14}px</p></Field><label className="block"><span className="mb-2 block text-xs font-medium uppercase tracking-wide text-white/40">Message background</span><select value={textBackground} onChange={e => update({ textBackground: e.target.value as ElaraSettings['textBackground'] })} className={inputClass}><option value="slate">Obsidian Slate</option><option value="deep-onyx">Deep Onyx</option><option value="midnight-blue">Midnight Sapphire</option><option value="cyber-violet">Cyberpunk Amethyst</option><option value="emerald-terminal">Emerald Matrix</option><option value="frosted-glass">Frosted Glass</option><option value="high-contrast">High Contrast Slate</option></select></label><Toggle label="Send message on Enter" checked={formData.sendOnEnter !== false} onChange={checked => update({ sendOnEnter: checked })}/></div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><img src={activePortraitImage} alt="Elara portrait" className="mx-auto h-40 w-40 rounded-2xl object-cover" style={{ transform: `scale(${formData.portraitScale})` }}/><div className="mt-5 flex flex-wrap justify-center gap-2"><input ref={portraitInputRef} type="file" accept="image/*" className="hidden" onChange={e => void handlePortraitFile(e.target.files?.[0])}/><button type="button" onClick={() => portraitInputRef.current?.click()} className={buttonClass}>{customPortrait ? 'Replace portrait' : 'Upload portrait'}</button>{customPortrait && <button type="button" onClick={onRemovePortrait} className={buttonClass}>Reset portrait</button>}</div></div></div><div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><Field label="Backdrop opacity"><input type="range" min="0" max="1" step="0.05" value={formData.backdropOpacity} onChange={e => update({ backdropOpacity: Number(e.target.value) })} className="w-full"/></Field><Field label="Backdrop blur"><input type="range" min="0" max="20" step="1" value={formData.backdropBlur} onChange={e => update({ backdropBlur: Number(e.target.value) })} className="w-full"/></Field><input ref={backdropInputRef} type="file" accept="image/*" className="hidden" onChange={e => void handleBackdropFile(e.target.files?.[0])}/><button type="button" onClick={() => backdropInputRef.current?.click()} className={buttonClass}>Choose backdrop</button>{formData.backdropImage && <button type="button" onClick={() => update({ backdropImage: null })} className={buttonClass}>Remove backdrop</button>}</div></section>}

          {activeTab === 'voice' && <section className="space-y-5"><SectionTitle title="Voice & Chat" description="Voice input, chat editor, and reliability settings."/><VoiceChatSettingsPanel settings={formData} onChange={setFormData}/></section>}

          {activeTab === 'system' && <section className="space-y-5"><SectionTitle title="System behavior" description="Application-owned prompts and runtime behavior."/><PromptField label="System prompt" value={formData.systemPrompt} onChange={value => update({ systemPrompt: value })}/><PromptField label="Persona protocol" value={formData.personaProtocol} onChange={value => update({ personaProtocol: value })}/><PromptField label="Intimacy module" value={formData.intimacyModule} onChange={value => update({ intimacyModule: value })}/><PromptField label="Runtime rules" value={formData.runtimeRules} onChange={value => update({ runtimeRules: value })}/><label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={formData.adultFictionEnabled !== false} onChange={e => update({ adultFictionEnabled: e.target.checked })}/>Enable adult fiction framing</label><button type="button" onClick={() => setShowPromptResetConfirm(true)} className={buttonClass}>Reset prompts</button>{showPromptResetConfirm && <ConfirmBox message="Reset the editable prompts to their defaults?" onConfirm={handleResetPrompt} onCancel={() => setShowPromptResetConfirm(false)}/>}</section>}

          {activeTab === 'data' && <section className="space-y-5"><SectionTitle title="Data" description="Application export/import and local reset controls."/><div className="flex flex-wrap gap-2"><button type="button" onClick={onExportAllData} className={buttonClass}>Export all data</button><input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={e => void handleImportFile(e.target.files?.[0])}/><button type="button" onClick={() => importInputRef.current?.click()} className={buttonClass}>Import data</button></div>{status && <p className="text-sm text-white/55">{status}</p>}<div className="rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-4"><p className="text-sm font-medium text-red-100">Clear all local data</p><p className="mt-1 text-xs leading-5 text-red-100/60">This clears application-owned local data. Google access remains managed by Google Hub.</p><button type="button" onClick={() => setShowClearConfirm(true)} className="mt-3 rounded-xl border border-red-300/20 bg-red-300/[0.05] px-4 py-2.5 text-sm text-red-100">Clear all data</button>{showClearConfirm && <ConfirmBox message="Clear all application data?" onConfirm={() => { setShowClearConfirm(false); onClearAllData(); }} onCancel={() => setShowClearConfirm(false)}/>}</div></section>}
        </main>
      <footer className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4"><button type="button" onClick={onClose} className={buttonClass}>Cancel</button><button type="button" onClick={handleSave} className="rounded-xl border border-white/15 bg-white/[0.08] px-4 py-2.5 text-sm font-medium hover:bg-white/[0.12]">Save changes</button></footer>
    </div>
  </div>;
};

function SectionTitle({ title, description }: { title: string; description: string }) { return <div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-sm text-white/50">{description}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-xs font-medium uppercase tracking-wide text-white/40">{label}</span>{children}</label>; }
function PromptField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={label}><textarea value={value} onChange={e => onChange(e.target.value)} rows={8} className={`${inputClass} resize-y leading-6`}/></Field>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-sm text-white/70"><span>{label}</span><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /></label>; }
function ConfirmBox({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) { return <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-sm text-white/70">{message}</p><div className="mt-3 flex gap-2"><button type="button" onClick={onConfirm} className="rounded-xl border border-red-300/20 bg-red-300/[0.06] px-3 py-2 text-xs text-red-100">Confirm</button><button type="button" onClick={onCancel} className={buttonClass}>Cancel</button></div></div>; }
