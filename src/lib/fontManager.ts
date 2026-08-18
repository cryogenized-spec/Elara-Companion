import type { ElaraSettings } from '../types';

const GOOGLE_FONTS_HOSTS = new Set(['fonts.googleapis.com']);
const GOOGLE_FONT_FAMILIES_KEY = 'elara_google_font_config_v1';
const FONT_LINK_MARKER = 'data-elara-font';

export interface FontLoadResult {
  status: 'loaded' | 'fallback' | 'failed';
  family: string;
}

function isSafeGoogleFontsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && GOOGLE_FONTS_HOSTS.has(url.hostname) && url.pathname === '/css2';
  } catch {
    return false;
  }
}

function buildGoogleFontsUrl(family: string, weights: number[]): string {
  const normalized = family.trim().replace(/\s+/g, '+');
  const uniqueWeights = Array.from(new Set(weights.filter((w) => Number.isFinite(w)).map((w) => Math.max(100, Math.min(900, Math.round(w / 100) * 100))))).sort((a, b) => a - b);
  const axis = uniqueWeights.length > 0 ? `:wght@${uniqueWeights.join(';')}` : '';
  return `https://fonts.googleapis.com/css2?family=${normalized}${axis}&display=swap`;
}

function ensureStylesheet(href: string): Promise<FontLoadResult> {
  if (!isSafeGoogleFontsUrl(href)) {
    return Promise.resolve({ status: 'fallback', family: 'system-ui' });
  }

  const existing = document.querySelector(`link[${FONT_LINK_MARKER}="${CSS.escape(href)}"]`) as HTMLLinkElement | null;
  if (existing?.dataset.loaded === 'true') {
    return Promise.resolve({ status: 'loaded', family: '' });
  }

  return new Promise((resolve) => {
    const link = existing || document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(FONT_LINK_MARKER, href);
    link.dataset.loading = 'true';
    link.onload = () => {
      link.dataset.loading = 'false';
      link.dataset.loaded = 'true';
      resolve({ status: 'loaded', family: '' });
    };
    link.onerror = () => {
      link.dataset.loading = 'false';
      link.dataset.failed = 'true';
      resolve({ status: 'failed', family: 'system-ui' });
    };
    if (!existing) document.head.appendChild(link);
  });
}

function setCssVar(name: string, value: string): void {
  document.documentElement.style.setProperty(name, value);
}

export function applyTypography(settings: Partial<ElaraSettings>): void {
  if (typeof document === 'undefined') return;

  const userFamily = settings.userFontFamily?.trim() || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const assistantFamily = settings.assistantFontFamily?.trim() || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  setCssVar('--elara-user-font', userFamily);
  setCssVar('--elara-user-size', `${Math.max(10, Math.min(24, settings.userFontSize ?? settings.fontSize ?? 14))}px`);
  setCssVar('--elara-user-weight', String(settings.userFontWeight ?? 400));
  setCssVar('--elara-user-color', settings.userTextColor || '#e4e4e7');

  setCssVar('--elara-assistant-font', assistantFamily);
  setCssVar('--elara-assistant-size', `${Math.max(10, Math.min(24, settings.assistantFontSize ?? settings.fontSize ?? 14))}px`);
  setCssVar('--elara-assistant-weight', String(settings.assistantFontWeight ?? 400));
  setCssVar('--elara-assistant-color', settings.assistantTextColor || '#f4f4f5');
}

export async function loadConfiguredFonts(settings: Partial<ElaraSettings>): Promise<FontLoadResult[]> {
  if (typeof document === 'undefined') return [];

  const fontConfigs = [
    { family: settings.userFontFamily, source: settings.userFontSource, weight: settings.userFontWeight },
    { family: settings.assistantFontFamily, source: settings.assistantFontSource, weight: settings.assistantFontWeight },
  ];

  const results: FontLoadResult[] = [];
  const urls = new Set<string>();

  for (const config of fontConfigs) {
    if (config.source !== 'google' || !config.family?.trim()) continue;
    const weights = [config.weight || 400];
    const href = config.family.startsWith('https://') ? config.family : buildGoogleFontsUrl(config.family, weights);
    if (!isSafeGoogleFontsUrl(href)) {
      results.push({ status: 'fallback', family: config.family });
      continue;
    }
    if (urls.has(href)) continue;
    urls.add(href);
    const result = await ensureStylesheet(href);
    results.push({ ...result, family: config.family });
  }

  try {
    localStorage.setItem(GOOGLE_FONT_FAMILIES_KEY, JSON.stringify(fontConfigs));
  } catch {
    // Configuration persistence is best-effort; normal settings persistence remains authoritative.
  }

  return results;
}

export async function applyTypographySettings(settings: Partial<ElaraSettings>): Promise<void> {
  applyTypography(settings);
  await loadConfiguredFonts(settings);
}

export function clearConfiguredFontStyles(): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll(`link[${FONT_LINK_MARKER}]`).forEach((node) => node.remove());
}
