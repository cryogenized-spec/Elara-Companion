import type { ElaraSettings } from '../types';
import { applyTypographySettings } from './fontManager';

export type ThemeMode = 'dark' | 'light' | 'system';

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode !== 'system') return mode;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

export function applySettingsAppearance(settings: Partial<ElaraSettings>): void {
  applyTheme((settings.themeMode || settings.theme || 'dark') as ThemeMode);
  void applyTypographySettings(settings);
}

export function watchSystemTheme(mode: ThemeMode): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const media = window.matchMedia('(prefers-color-scheme: light)');
  const handler = () => {
    if (mode === 'system') applyTheme(mode);
  };
  media.addEventListener?.('change', handler);
  return () => media.removeEventListener?.('change', handler);
}
