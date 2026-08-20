import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Check, ChevronDown, RefreshCw, SlidersHorizontal, X, Zap } from 'lucide-react';
import type { ElaraSettings } from '../types';
import { getDbSettings, setDbSettings } from '../lib/db';
import { getModelProfile } from '../lib/modelRegistry';
import { discoverGeminiModels, type DiscoveredModel } from '../lib/modelDiscovery';
import { applySettingsAppearance } from '../lib/themeManager';
import { DEFAULT_THINKING_DISPLAY_MODE, loadThinkingDisplayMode, saveThinkingDisplayMode, type ThinkingDisplayMode } from '../lib/thinkingDisplay';

export const ModelTuningQuickPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ElaraSettings | null>(null);
  const [models, setModels] = useState<DiscoveredModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [thinkingDisplayMode, setThinkingDisplayMode] = useState<ThinkingDisplayMode>(DEFAULT_THINKING_DISPLAY_MODE);

  useEffect(() => {
    if (!open) return;
    getDbSettings().then(async (loaded) => {
      setSettings(loaded);
      setThinkingDisplayMode(loadThinkingDisplayMode());
      applySettingsAppearance(loaded);
      if (loaded.apiKey) {
        setLoadingModels(true);
        try { setModels(await discoverGeminiModels(loaded.apiKey, false)); } finally { setLoadingModels(false); }
      }
    });
  }, [open]);

  const profile = useMemo(() => getModelProfile(settings?.model), [settings?.model]);

  const update = (patch: Partial<ElaraSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    void setDbSettings(next);
    applySettingsAppearance(next);
  };

  const selectModel = (model: string) => {
    const nextProfile = getModelProfile(model);
    update({
      model,
      maxOutputTokens: Math.min(nextProfile.maxOutputTokensMax, Math.max(nextProfile.maxOutputTokensMin, settings?.maxOutputTokens || 16384)),
      thinkingLevel: nextProfile.thinkingLevels?.includes(settings?.thinkingLevel || 'medium') ? (settings?.thinkingLevel || 'medium') : (nextProfile.thinkingLevels?.[0] || 'low'),
      thinkingBudget: nextProfile.thinkingControl === 'budget' ? Math.min(nextProfile.thinkingBudgetMax || 24576, Math.max(nextProfile.thinkingBudgetMin ?? 0, settings?.thinkingBudget ?? 4096)) : settings?.thinkingBudget,
      temperature: nextProfile.supportsTemperature ? Math.min(nextProfile.temperatureMax, Math.max(nextProfile.temperatureMin, settings?.temperature ?? 0.85)) : settings?.temperature,
      topP: nextProfile.supportsTopP ? Math.min(nextProfile.topPMax, Math.max(nextProfile.topPMin, settings?.topP ?? 0.95)) : settings?.topP,
      topK: nextProfile.supportsTopK ? Math.min(nextProfile.topKMax, Math.max(nextProfile.topKMin, settings?.topK ?? 64)) : settings?.topK,
    });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed left-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-40 h-11 w-11 rounded-full border border-zinc-700/80 bg-zinc-900/90 text-zinc-300 shadow-xl backdrop-blur-md transition hover:bg-zinc-800 hover:text-white active:scale-95 md:left-5" aria-label="Open model tuning" title="Model tuning">
        <SlidersHorizontal className="mx-auto h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <section className="absolute inset-x-0 bottom-0 mx-auto max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-[var(--elara-surface)] p-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-700" />
            <div className="mb-4 flex items-center justify-between">
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Agent Runtime</p><h2 className="text-base font-semibold text-[var(--elara-text)]">Model tuning</h2></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            {settings && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-medium text-zinc-400">Model</span><button type="button" onClick={async()=>{setLoadingModels(true);try{setModels(await discoverGeminiModels(settings.apiKey || '', true));}finally{setLoadingModels(false);}}} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" title="Refresh model catalogue">{loadingModels ? <RefreshCw className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}</button></div>
                  <select value={settings.model} onChange={(e)=>selectModel(e.target.value)} className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white">
                    {(models.length ? models.map((m)=>m.id) : [profile.id]).map((id)=>{const p=getModelProfile(id); return <option key={id} value={id}>{p.name}{models.length ? '' : ' (catalogue)'} </option>;})}
                  </select>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{profile.description}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-zinc-500"><span>Thinking: {profile.thinkingControl}</span><span>Output cap: {profile.maxOutputTokensMax.toLocaleString()}</span></div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200"><Brain className="h-4 w-4 text-sky-400"/> Thinking</div>
                  {profile.thinkingControl === 'level' ? (
                    <div className="grid grid-cols-4 gap-1.5">{(profile.thinkingLevels || []).map((level)=>{const active=settings.thinkingLevel===level;return <button key={level} type="button" onClick={()=>update({thinkingLevel:level})} className={`min-h-11 rounded-xl border text-xs capitalize ${active?'border-sky-500 bg-sky-500/10 text-sky-300':'border-zinc-800 bg-zinc-950 text-zinc-400'}`}>{level}</button>;})}</div>
                  ) : (
                    <div><div className="mb-2 flex justify-between text-xs text-zinc-400"><span>Thinking budget</span><span>{Math.max(profile.thinkingBudgetMin || 0, Math.min(profile.thinkingBudgetMax || 24576, settings.thinkingBudget || 0)).toLocaleString()}</span></div><input type="range" min={profile.thinkingBudgetMin || 0} max={profile.thinkingBudgetMax || 24576} step="128" value={Math.max(profile.thinkingBudgetMin || 0, Math.min(profile.thinkingBudgetMax || 24576, settings.thinkingBudget || 0))} onChange={(e)=>update({thinkingBudget:Number(e.target.value)})} className="w-full"/></div>
                  )}
                </div>

                <div className="rounded-2xl border border-sky-900/40 bg-sky-950/10 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200"><Brain className="h-4 w-4 text-sky-400"/> Thinking display</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      ['off', 'Off'],
                      ['steps', 'Steps'],
                      ['summaries', 'Summaries'],
                    ] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => { setThinkingDisplayMode(mode); saveThinkingDisplayMode(mode); }}
                        className={`min-h-11 rounded-xl border text-xs font-medium transition-colors ${thinkingDisplayMode === mode ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                    Off hides the thinking surface. Steps shows concise step labels only. Summaries shows the user-facing thinking summary and can be expanded.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200"><Zap className="h-4 w-4 text-amber-400"/> Output</div>
                  <div className="mb-2 flex justify-between text-xs text-zinc-400"><span>Maximum output</span><span>{settings.maxOutputTokens.toLocaleString()}</span></div>
                  <input type="range" min={profile.maxOutputTokensMin} max={profile.maxOutputTokensMax} step="256" value={Math.min(profile.maxOutputTokensMax, Math.max(profile.maxOutputTokensMin, settings.maxOutputTokens))} onChange={(e)=>update({maxOutputTokens:Number(e.target.value)})} className="w-full"/>
                  <div className="mt-1 flex justify-between text-[10px] text-zinc-600"><span>{profile.maxOutputTokensMin}</span><span>{profile.maxOutputTokensMax.toLocaleString()}</span></div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-200"><SlidersHorizontal className="h-4 w-4"/> Sampling</div>
                  {([
                    ['Temperature','temperature',profile.supportsTemperature,profile.temperatureMin,profile.temperatureMax,settings.temperature],
                    ['Top-P','topP',profile.supportsTopP,profile.topPMin,profile.topPMax,settings.topP],
                    ['Top-K','topK',profile.supportsTopK,profile.topKMin,profile.topKMax,settings.topK],
                  ] as const).map(([label,key,supported,min,max,value])=> <label key={key} className={`block text-xs ${supported?'text-zinc-400':'text-zinc-600'}`}><div className="mb-1 flex justify-between"><span>{label}</span><span>{supported?String(value):'Unavailable'}</span></div><input disabled={!supported} type="range" min={min} max={max} step={key==='temperature'?0.05:key==='topP'?0.01:1} value={supported?(value as number):min} onChange={(e)=>update({[key]:Number(e.target.value)} as Partial<ElaraSettings>)} className="w-full disabled:opacity-30"/></label>)}
                  <p className="text-[10px] leading-relaxed text-zinc-600">Unsupported controls are deliberately omitted from Gemini requests rather than sent and rejected.</p>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/20 p-3 text-[11px] text-zinc-500"><Check className="h-4 w-4 text-emerald-400"/> Settings persist across refreshes and model changes are clamped to the selected model's limits.</div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
};