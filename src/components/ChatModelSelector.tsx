import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronUp, Sparkles } from 'lucide-react';
import { getDbSettings, setDbSettings } from '../lib/db';
import { getModelPreferenceOptions, createModelPreferenceState, type ModelPreferenceState } from '../lib/modelPreference';
import type { ElaraSettings } from '../types';

const SETTINGS_CHANGED_EVENT = 'elara-settings-changed';

function friendlyModelName(modelId: string): string {
  return modelId
    .replace(/^gemini-/, 'Gemini ')
    .replace(/-flash-lite$/, ' Flash-Lite')
    .replace(/-flash$/, ' Flash')
    .replace(/-pro$/, ' Pro')
    .replace(/-preview$/, ' Preview');
}

export const ChatModelSelector: React.FC = () => {
  const [settings, setSettings] = useState<ElaraSettings | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    void getDbSettings().then((next) => {
      if (mounted) {
        setSettings(next);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const handleSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ settings?: ElaraSettings }>).detail;
      if (detail?.settings) setSettings(detail.settings);
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
    return () => {
      mounted = false;
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const preference = useMemo<ModelPreferenceState | null>(() => {
    if (!settings) return null;
    return createModelPreferenceState(settings.model, settings.reliabilitySettings);
  }, [settings]);

  const options = useMemo(() => {
    if (!preference) return [];
    return getModelPreferenceOptions(preference, preference.preferredModelOrder);
      .filter((option) => option.preferenceRank !== null || option.isPreferred);
  }, [preference]);

  const selectModel = async (modelId: string) => {
    if (!settings || !preference) return;
    const nextSettings: ElaraSettings = {
      ...settings,
      model: modelId,
      reliabilitySettings: {
        ...(settings.reliabilitySettings || {}),
        preferredModelOrder: [modelId, ...preference.preferredModelOrder.filter((id) => id !== modelId)],
      } as ElaraSettings['reliabilitySettings'],
    };

    try {
      await setDbSettings(nextSettings);
      setSettings(nextSettings);
      window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: { settings: nextSettings } }));
      setOpen(false);
    } catch {
      // Persistence failure leaves the current model selected and menu open.
    }
  };

  const selectedLabel = settings ? friendlyModelName(settings.model) : 'Model';

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        disabled={loading}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Select model"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex max-w-[10.5rem] items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/85 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 shadow-sm transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-none"
      >
        <Sparkles className="h-3 w-3 shrink-0 text-sky-400" />
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronUp className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Select model"
          className="absolute bottom-full left-0 z-50 mb-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950/98 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Preferred models</div>
          {options.map((option) => {
            const selected = option.id === preference?.preferredModel;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                disabled={!option.isAvailable}
                onClick={() => void selectModel(option.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${selected ? 'bg-sky-950/50 text-sky-200' : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100'} ${!option.isAvailable ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 font-mono text-[9px] text-zinc-500">
                  {option.preferenceRank ?? '—'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium">{option.name}</span>
                  {!option.isAvailable && <span className="block text-[9px] text-zinc-600">Unavailable</span>}
                </span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
