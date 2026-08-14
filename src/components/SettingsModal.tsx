import React, { useState, useRef } from 'react';
import { ElaraSettings, AVAILABLE_MODELS } from '../types';
import { DEFAULT_ELARA_SYSTEM_PROMPT } from '../constants/defaultPrompt';
import { DEFAULT_ELARA_PORTRAIT } from '../constants/defaultPortrait';
import {
  X,
  RotateCcw,
  Sparkles,
  Download,
  Upload,
  Trash2,
  Sliders,
  User,
  Check,
  AlertTriangle,
  Image as ImageIcon,
  RefreshCw,
  Maximize2,
  SlidersHorizontal,
  Type,
  Palette,
  Brain,
  Zap,
  Key,
  Globe,
  ExternalLink,
} from 'lucide-react';

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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  customPortrait,
  onUploadPortrait,
  onRemovePortrait,
  onExportAllData,
  onImportData,
  onClearAllData,
}) => {
  const [formData, setFormData] = useState<ElaraSettings>(settings);
  const [activeTab, setActiveTab] = useState<'persona' | 'visuals' | 'system' | 'data'>('visuals');
  const [showPromptResetConfirm, setShowPromptResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const portraitFileInputRef = useRef<HTMLInputElement>(null);
  const backdropFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const activePortraitImage = customPortrait || DEFAULT_ELARA_PORTRAIT;

  const handleResetPrompt = () => {
    setFormData((prev) => ({
      ...prev,
      systemPrompt: DEFAULT_ELARA_SYSTEM_PROMPT,
    }));
    setShowPromptResetConfirm(false);
  };

  const handleSave = () => {
    onSaveSettings(formData);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          onImportData(content);
          setImportStatus('Data imported successfully!');
          setTimeout(() => setImportStatus(null), 3000);
        } catch (err: any) {
          setImportStatus('Failed to import: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePortraitFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file is too large. Please select an image under 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadPortrait(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBackdropFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      alert('Image file is too large. Please select an image under 12MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({
          ...prev,
          backdropImage: reader.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={portraitFileInputRef}
        onChange={handlePortraitFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={backdropFileInputRef}
        onChange={handleBackdropFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json"
        className="hidden"
      />

      <div className="bg-[#121212] border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Elara Settings & Appearance</h2>
              <p className="text-xs text-zinc-400">Character portrait, chat backdrop & model customization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/30 px-6 pt-2 gap-2 text-xs font-medium overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('visuals')}
            className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'visuals'
                ? 'border-sky-500 text-sky-400 bg-zinc-900/80 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Portrait & Backdrop</span>
          </button>
          <button
            onClick={() => setActiveTab('persona')}
            className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'persona'
                ? 'border-sky-500 text-sky-400 bg-zinc-900/80 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Model & User</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'system'
                ? 'border-sky-500 text-sky-400 bg-zinc-900/80 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>System Prompt</span>
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'data'
                ? 'border-sky-500 text-sky-400 bg-zinc-900/80 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Data Backup</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-zinc-200 leading-relaxed font-sans custom-scrollbar">
          {/* TAB 1: PORTRAIT & BACKDROP VISUALS */}
          {activeTab === 'visuals' && (
            <div className="space-y-6">
              {/* Character Portrait Upload & Scale Section */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-sky-400" />
                      <span>Elara Character Portrait</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Upload a custom 4:5 portrait image for Elara and adjust her display size scale.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  {/* Thumbnail Preview Box */}
                  <div className="flex flex-col items-center justify-center sm:border-r border-zinc-800/80 pr-0 sm:pr-4 min-h-[160px]">
                    <div
                      style={{
                        width: `${Math.round(112 * Math.min(formData.portraitScale ?? 1.0, 1.8))}px`,
                      }}
                      className="relative aspect-[4/5] rounded-xl overflow-hidden bg-zinc-950 border border-sky-500/30 shadow-md flex items-center justify-center transition-all duration-150"
                    >
                      <img
                        src={activePortraitImage}
                        alt="Portrait Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-2 font-mono">
                      Panel Frame Scale ({(formData.portraitScale ?? 1.0).toFixed(1)}x)
                    </span>
                  </div>

                  {/* Upload Controls & Scale Slider */}
                  <div className="sm:col-span-2 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => portraitFileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-md shadow-sky-900/30 transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{customPortrait ? 'Replace Portrait' : 'Upload Portrait Image'}</span>
                      </button>

                      {customPortrait && (
                        <button
                          type="button"
                          onClick={onRemovePortrait}
                          className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-red-950/50 text-zinc-300 hover:text-red-300 border border-zinc-700/60 text-xs transition-colors"
                          title="Reset to default portrait"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Portrait Multiplier Scale Slider */}
                    <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-medium text-zinc-300">Portrait Size Scale</label>
                        <span className="font-mono text-sky-400 font-semibold text-xs">
                          {(formData.portraitScale ?? 1.0).toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={formData.portraitScale ?? 1.0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            portraitScale: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                        <span>0.5x</span>
                        <span>1.0x (Default)</span>
                        <span>2.0x</span>
                        <span>3.0x</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography & Font Size Customization */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Type className="w-4 h-4 text-sky-400" />
                      <span>Dialogue Typography & Font Size</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Adjust the reading font size of dialogue and messages across the chat.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  {/* Live Font Preview Box */}
                  <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 flex flex-col justify-center min-h-[90px]">
                    <span className="text-[10px] text-zinc-500 font-mono mb-1">Live Font Preview ({formData.fontSize ?? 14}px)</span>
                    <p
                      style={{ fontSize: `${formData.fontSize ?? 14}px` }}
                      className="text-zinc-200 leading-relaxed transition-all font-sans"
                    >
                      "Good evening. I'm right here beside you whenever you're ready."
                    </p>
                  </div>

                  {/* Font Size Slider */}
                  <div className="sm:col-span-2 space-y-2 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-medium text-zinc-300">Message Text Size</label>
                      <span className="font-mono text-sky-400 font-semibold text-xs">
                        {formData.fontSize ?? 14} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="20"
                      step="1"
                      value={formData.fontSize ?? 14}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fontSize: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>10px (Compact)</span>
                      <span>14px (Default)</span>
                      <span>17px</span>
                      <span>20px (Large)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text & Message Background Palette */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-sky-400" />
                      <span>Text & Message Bubble Background</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Choose the ambient color scheme and surface styling for dialogue cards and user bubbles.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'slate',
                      name: 'Obsidian Slate (Default)',
                      desc: 'Balanced dark graphite with subtle borders',
                      bgClass: 'bg-zinc-900 border-zinc-800 text-zinc-200',
                      chip: 'bg-zinc-800',
                    },
                    {
                      id: 'deep-onyx',
                      name: 'Deep Onyx Pitch',
                      desc: 'Pure deep black canvas with minimal contrast',
                      bgClass: 'bg-black border-zinc-900 text-zinc-100',
                      chip: 'bg-black border border-zinc-700',
                    },
                    {
                      id: 'midnight-blue',
                      name: 'Midnight Sapphire',
                      desc: 'Deep oceanic navy with subtle azure undertones',
                      bgClass: 'bg-[#080f20] border-sky-900/60 text-sky-100',
                      chip: 'bg-[#080f20] border border-sky-600',
                    },
                    {
                      id: 'cyber-violet',
                      name: 'Cyberpunk Amethyst',
                      desc: 'Dark obsidian violet with neon purple accents',
                      bgClass: 'bg-[#120824] border-purple-900/60 text-purple-100',
                      chip: 'bg-[#120824] border border-purple-600',
                    },
                    {
                      id: 'emerald-terminal',
                      name: 'Emerald Matrix',
                      desc: 'Dark cybernetic emerald green terminal tones',
                      bgClass: 'bg-[#05140d] border-emerald-900/60 text-emerald-100',
                      chip: 'bg-[#05140d] border border-emerald-600',
                    },
                    {
                      id: 'frosted-glass',
                      name: 'Frosted Glass Blur',
                      desc: 'Translucent acrylic glass with delicate edge borders',
                      bgClass: 'bg-zinc-900/50 backdrop-blur-md border-white/10 text-zinc-100',
                      chip: 'bg-zinc-800/60 border border-white/20',
                    },
                    {
                      id: 'high-contrast',
                      name: 'High Contrast Slate',
                      desc: 'Crisp distinct borders for maximum readability',
                      bgClass: 'bg-zinc-900 border-2 border-zinc-600 text-white',
                      chip: 'bg-zinc-900 border-2 border-zinc-400',
                    },
                  ].map((themeOpt) => {
                    const isSelected = (formData.textBackground || 'slate') === themeOpt.id;
                    return (
                      <div
                        key={themeOpt.id}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            textBackground: themeOpt.id as any,
                          })
                        }
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'ring-2 ring-sky-500 bg-sky-950/30 border-sky-500/80 shadow-md'
                            : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg shrink-0 mt-0.5 shadow-sm ${themeOpt.chip}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-200">{themeOpt.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{themeOpt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chat Backdrop Screen Section */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                      <span>Chat Backdrop Screen</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Set a custom background image for the main chat workspace behind dialogue.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Backdrop Preview & Upload Row */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                      <div className="w-16 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden relative shrink-0 flex items-center justify-center">
                        {formData.backdropImage ? (
                          <img
                            src={formData.backdropImage}
                            alt="Backdrop Preview"
                            className="w-full h-full object-cover"
                            style={{
                              opacity: formData.backdropOpacity ?? 0.3,
                              filter: `blur(${(formData.backdropBlur ?? 4) / 2}px)`,
                            }}
                          />
                        ) : (
                          <span className="text-[10px] text-zinc-600 font-mono">None</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-200">
                          {formData.backdropImage ? 'Custom Chat Backdrop Active' : 'No Backdrop Image Set'}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {formData.backdropImage
                            ? 'Rendered behind conversation feed'
                            : 'Upload a cozy room, ambient scenery, or wallpaper'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => backdropFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-all shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5 text-sky-400" />
                        <span>{formData.backdropImage ? 'Change Image' : 'Upload Backdrop'}</span>
                      </button>

                      {formData.backdropImage && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, backdropImage: null })}
                          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-red-950/50 text-zinc-400 hover:text-red-400 border border-zinc-700/60 transition-colors"
                          title="Remove Backdrop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sliders for Opacity and Blur */}
                  {formData.backdropImage && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <label className="font-medium text-zinc-300">Backdrop Opacity</label>
                          <span className="font-mono text-sky-400 font-semibold text-xs">
                            {Math.round((formData.backdropOpacity ?? 0.3) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="1.0"
                          step="0.05"
                          value={formData.backdropOpacity ?? 0.3}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              backdropOpacity: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <label className="font-medium text-zinc-300">Backdrop Blur</label>
                          <span className="font-mono text-sky-400 font-semibold text-xs">
                            {formData.backdropBlur ?? 4}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={formData.backdropBlur ?? 4}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              backdropBlur: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MODEL & USER */}
          {activeTab === 'persona' && (
            <div className="space-y-5">
              {/* User Name & Timezone Config */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    User Name (replaces [[user]])
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={formData.userName}
                      onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                      placeholder="e.g. Alex"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    World Timezone
                  </label>
                  <select
                    value={formData.timezone || 'Africa/Johannesburg'}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="Africa/Johannesburg">Africa/Johannesburg (UTC+2) [Default]</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  </select>
                </div>
              </div>

              {/* Gemini API Key Configuration (Required for GitHub Pages / Static hosting) */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      <span>Gemini API Key (GitHub Pages & Client Mode)</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Required when hosting as a static GitHub Page without a backend server.
                    </p>
                  </div>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/80 text-sky-400 border border-sky-800/60 text-[11px] hover:bg-sky-900 transition-colors"
                  >
                    <span>Get Free Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="password"
                      value={formData.apiKey || ''}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="AIzaSy... (Leave empty to use backend server if deployed to Vercel/Cloud Run)"
                      className="w-full pl-3 pr-20 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono focus:outline-none focus:border-sky-500"
                    />
                    {formData.apiKey && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, apiKey: '' })}
                        className="absolute right-2 top-2 px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    🔒 <strong>Privacy:</strong> Your key is stored solely in your browser's private <code className="font-mono text-zinc-400">localStorage</code>. When hosting on GitHub Pages, requests go directly to Google Gemini API over HTTPS.
                  </p>
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Gemini Model
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {AVAILABLE_MODELS.map((m) => {
                    const isSelected = formData.model === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setFormData({ ...formData, model: m.id })}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-sky-950/40 border-sky-500/60 ring-1 ring-sky-500/30'
                            : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-100 text-xs sm:text-sm">{m.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{m.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Temperature & Output Length Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-zinc-300">Temperature</label>
                    <span className="text-xs font-mono text-sky-400">{formData.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.05"
                    value={formData.temperature}
                    onChange={(e) =>
                      setFormData({ ...formData, temperature: parseFloat(e.target.value) })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Higher values yield more creative roleplay dialogue.</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-zinc-300">Max Output Tokens</label>
                    <span className="text-xs font-mono text-sky-400">{formData.maxOutputTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="8192"
                    step="256"
                    value={formData.maxOutputTokens}
                    onChange={(e) =>
                      setFormData({ ...formData, maxOutputTokens: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Allows substantial long-form roleplay responses.</p>
                </div>
              </div>

              {/* LLM Thinking & Reasoning Effort Slider */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-sky-400" />
                      <span>LLM Thinking Effort & Reasoning Budget</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Controls Gemini 2.5 / 3.7 internal reasoning tokens before generating output.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-800/60 font-mono text-xs font-semibold">
                    {formData.thinkingBudget === 0
                      ? '0 (Off)'
                      : `${(formData.thinkingBudget ?? 4096).toLocaleString()} Tokens`}
                  </span>
                </div>

                {/* Slider */}
                <div className="space-y-2 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                  <input
                    type="range"
                    min="0"
                    max="16384"
                    step="512"
                    value={formData.thinkingBudget ?? 4096}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thinkingBudget: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>0 (Off)</span>
                    <span>2k (Fast)</span>
                    <span>4k (Standard)</span>
                    <span>8k (Deep)</span>
                    <span>16k (Max)</span>
                  </div>
                </div>

                {/* Dynamic Status / Description Card */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-start gap-2.5 text-xs">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-zinc-300 leading-relaxed">
                    {(formData.thinkingBudget ?? 4096) === 0 && (
                      <span>
                        <strong className="text-zinc-100">Thinking Disabled:</strong> Fastest possible response speed. Instant generation without internal thinking scratchpad.
                      </span>
                    )}
                    {(formData.thinkingBudget ?? 4096) > 0 && (formData.thinkingBudget ?? 4096) <= 2048 && (
                      <span>
                        <strong className="text-zinc-100">Light / Fast Thinking:</strong> Quick reasoning for conversational flow while verifying tone and safety filters.
                      </span>
                    )}
                    {(formData.thinkingBudget ?? 4096) > 2048 && (formData.thinkingBudget ?? 4096) <= 6144 && (
                      <span>
                        <strong className="text-zinc-100">Deep Reasoning (Recommended):</strong> Balances rich character immersion, complex narrative memory, and responsive streaming.
                      </span>
                    )}
                    {(formData.thinkingBudget ?? 4096) > 6144 && (
                      <span>
                        <strong className="text-zinc-100">Exhaustive High-Effort Thinking:</strong> Maximum reasoning tokens allocated for deep analysis, intricate plotlines, and nuanced writing.
                      </span>
                    )}
                  </div>
                </div>

                {/* Preset Quick Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Off (0)', val: 0 },
                    { label: 'Light (1,024)', val: 1024 },
                    { label: 'Balanced (2,048)', val: 2048 },
                    { label: 'Deep (4,096)', val: 4096 },
                    { label: 'Thorough (8,192)', val: 8192 },
                    { label: 'Maximum (16,384)', val: 16384 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, thinkingBudget: preset.val })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        (formData.thinkingBudget ?? 4096) === preset.val
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* History Toggle */}
              <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <div>
                  <p className="text-xs font-medium text-zinc-200">Include Conversation History</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Pass previous dialogue messages to Gemini for context continuity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, includeHistory: !formData.includeHistory })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.includeHistory ? 'bg-sky-600' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.includeHistory ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM PROMPT */}
          {activeTab === 'system' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Elara System Prompt
                </label>
                <button
                  type="button"
                  onClick={() => setShowPromptResetConfirm(true)}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>
              </div>

              {showPromptResetConfirm && (
                <div className="mb-3 p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-200 flex items-center justify-between">
                  <span>Reset system prompt to initial Elara persona?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetPrompt}
                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium"
                    >
                      Yes, Reset
                    </button>
                    <button
                      onClick={() => setShowPromptResetConfirm(false)}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                rows={12}
                className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:outline-none focus:border-sky-500 leading-relaxed resize-y custom-scrollbar"
              />
            </div>
          )}

          {/* TAB 4: DATA BACKUP */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Data Management & Backup
              </h3>

              {importStatus && (
                <div className="p-2.5 rounded-lg bg-sky-950/60 border border-sky-800/60 text-xs text-sky-300">
                  {importStatus}
                </div>
              )}

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={onExportAllData}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
                >
                  <Download className="w-4 h-4 text-sky-400" />
                  <span>Export All Conversations</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
                >
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Import Conversations</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-800/40 text-xs font-medium text-red-400 transition-colors ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear History</span>
                </button>
              </div>

              {showClearConfirm && (
                <div className="mt-3 p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>Are you sure you want to clear your chat history?</span>
                  </div>
                  <p className="text-red-300/80">This action will delete all local history permanently.</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        onClearAllData();
                        setShowClearConfirm(false);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium"
                    >
                      Delete Everything
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-[#121212] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-md shadow-sky-600/20"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

