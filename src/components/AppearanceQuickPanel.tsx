import React, { useEffect, useState } from 'react';
import { Palette, Type, X, Sun, Moon, Monitor, Check } from 'lucide-react';
import type { ElaraSettings } from '../types';
import { getDbSettings, setDbSettings } from '../lib/db';
import { applySettingsAppearance } from '../lib/themeManager';

const GOOGLE_FONT_HELP = 'Use a Google Fonts family name such as Inter, or a Google Fonts CSS2 URL from fonts.googleapis.com.';

export const AppearanceQuickPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ElaraSettings | null>(null);

  useEffect(() => {
    if (!open) return;
    getDbSettings().then((loaded) => {
      setSettings(loaded);
      applySettingsAppearance(loaded);
    });
  }, [open]);

  const update = (patch: Partial<ElaraSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    applySettingsAppearance(next);
    void setDbSettings(next);
  };

  const themeOptions: { value: ElaraSettings['theme']; label: string; icon: React.ReactNode }[] = [
    { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
    { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-40 h-11 w-11 rounded-full border border-zinc-700/80 bg-zinc-900/90 text-zinc-300 shadow-xl backdrop-blur-md transition hover:bg-zinc-800 hover:text-white active:scale-95 md:right-5"
        aria-label="Open appearance settings"
        title="Appearance"
      >
        <span className="text-sm font-semibold">Aa</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <section
            className="absolute inset-x-0 bottom-0 mx-auto max-h-[86dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-[var(--elara-surface)] p-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-700" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Appearance</p>
                <h2 className="text-base font-semibold text-[var(--elara-text)]">Fonts, colour & theme</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Close appearance settings">
                <X className="h-5 w-5" />
              </button>
            </div>

            {settings && (
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--elara-text)]"><Palette className="h-4 w-4" /> Theme</div>
                  <div className="grid grid-cols-3 gap-2">
                    {themeOptions.map((option) => {
                      const active = settings.theme === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => update({ theme: option.value })}
                          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm transition ${active ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700'}`}
                        >
                          {option.icon}
                          {option.label}
                          {active && <Check className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--elara-text)]"><Type className="h-4 w-4" /> Your messages</div>
                  <label className="block text-xs text-zinc-400">Font family
                    <input value={settings.userFontFamily || ''} onChange={(e) => update({ userFontFamily: e.target.value, userFontSource: e.target.value.trim() ? 'google' : 'system' })} placeholder="Inter" className="mt-1.5 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" />
                  </label>
                  <p className="text-[10px] text-zinc-600">{GOOGLE_FONT_HELP}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs text-zinc-400">Size
                      <input type="range" min="10" max="24" step="1" value={settings.userFontSize ?? 14} onChange={(e) => update({ userFontSize: Number(e.target.value) })} className="mt-3 w-full" />
                    </label>
                    <label className="block text-xs text-zinc-400">Weight
                      <select value={settings.userFontWeight ?? 400} onChange={(e) => update({ userFontWeight: Number(e.target.value) as 300 | 400 | 500 | 600 | 700 })} className="mt-1.5 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white">
                        {[300, 400, 500, 600, 700].map((weight) => <option key={weight} value={weight}>{weight}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="flex min-h-11 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-400">Text colour
                    <input type="color" value={settings.userTextColor || '#e4e4e7'} onChange={(e) => update({ userTextColor: e.target.value })} className="ml-auto h-9 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                  </label>
                </div>

                <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--elara-text)]"><Type className="h-4 w-4 text-emerald-400" /> Elara</div>
                  <label className="block text-xs text-zinc-400">Font family
                    <input value={settings.assistantFontFamily || ''} onChange={(e) => update({ assistantFontFamily: e.target.value, assistantFontSource: e.target.value.trim() ? 'google' : 'system' })} placeholder="Cormorant Garamond" className="mt-1.5 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" />
                  </label>
                  <p className="text-[10px] text-zinc-600">{GOOGLE_FONT_HELP}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs text-zinc-400">Size
                      <input type="range" min="10" max="24" step="1" value={settings.assistantFontSize ?? 14} onChange={(e) => update({ assistantFontSize: Number(e.target.value) })} className="mt-3 w-full" />
                    </label>
                    <label className="block text-xs text-zinc-400">Weight
                      <select value={settings.assistantFontWeight ?? 400} onChange={(e) => update({ assistantFontWeight: Number(e.target.value) as 300 | 400 | 500 | 600 | 700 })} className="mt-1.5 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white">
                        {[300, 400, 500, 600, 700].map((weight) => <option key={weight} value={weight}>{weight}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="flex min-h-11 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-400">Text colour
                    <input type="color" value={settings.assistantTextColor || '#f4f4f5'} onChange={(e) => update({ assistantTextColor: e.target.value })} className="ml-auto h-9 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                  </label>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
};
