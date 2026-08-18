import type { ElaraSettings } from '../types';

const GOOGLE_FONTS_HOSTS = new Set(['fonts.googleapis.com']);
const GOOGLE_FONT_FAMILIES_KEY = 'elara_google_font_config_v1';
const FONT_LINK_MARKER = 'data-elara-font';
const SYSTEM_FONTS = new Set([
  'system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'ui-sans-serif', 'ui-serif', 'ui-monospace',
  '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Ubuntu', 'Cantarell', 'Tahoma',
]);

export interface FontLoadResult { status: 'loaded' | 'fallback' | 'failed'; family: string; }

function isSafeGoogleFontsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && GOOGLE_FONTS_HOSTS.has(url.hostname) && url.pathname === '/css2';
  } catch { return false; }
}

function isSystemFontFamily(value?: string): boolean {
  if (!value?.trim()) return true;
  return value.split(',').map((part) => part.trim().replace(/^['"]|['"]$/g, '')).every((part) => SYSTEM_FONTS.has(part));
}

function buildGoogleFontsUrl(family: string, weight: number): string {
  const normalized = family.trim().replace(/\s+/g, '+');
  const safeWeight = Math.max(100, Math.min(900, Math.round(weight / 100) * 100));
  return `https://fonts.googleapis.com/css2?family=${normalized}:wght@${safeWeight}&display=swap`;
}

function ensureStylesheet(href: string): Promise<FontLoadResult> {
  if (!isSafeGoogleFontsUrl(href)) return Promise.resolve({ status: 'fallback', family: 'system-ui' });
  const existing = Array.from(document.querySelectorAll(`link[${FONT_LINK_MARKER}]`)).find((node) => (node as HTMLLinkElement).href === href) as HTMLLinkElement | undefined;
  if (existing?.dataset.loaded === 'true') return Promise.resolve({ status: 'loaded', family: '' });
  return new Promise((resolve) => {
    const link = existing || document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(FONT_LINK_MARKER, 'true');
    link.dataset.loading = 'true';
    link.onload = () => { link.dataset.loading = 'false'; link.dataset.loaded = 'true'; resolve({ status: 'loaded', family: '' }); };
    link.onerror = () => { link.dataset.loading = 'false'; link.dataset.failed = 'true'; resolve({ status: 'failed', family: 'system-ui' }); };
    if (!existing) document.head.appendChild(link);
  });
}

function setCssVar(name: string, value: string) { document.documentElement.style.setProperty(name, value); }

export function applyTypography(settings: Partial<ElaraSettings>): void {
  if (typeof document === 'undefined') return;
  const systemFallback = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const userFamily = settings.userFontFamily?.trim() || systemFallback;
  const assistantFamily = settings.assistantFontFamily?.trim() || systemFallback;
  setCssVar('--elara-user-font', isSystemFontFamily(userFamily) ? userFamily : `'${userFamily.replace(/'/g, '')}', ${systemFallback}`);
  setCssVar('--elara-user-size', `${Math.max(10, Math.min(24, settings.userFontSize ?? settings.fontSize ?? 14))}px`);
  setCssVar('--elara-user-weight', String(settings.userFontWeight ?? 400));
  setCssVar('--elara-user-color', settings.userTextColor || '#e4e4e7');
  setCssVar('--elara-assistant-font', isSystemFontFamily(assistantFamily) ? assistantFamily : `'${assistantFamily.replace(/'/g, '')}', ${systemFallback}`);
  setCssVar('--elara-assistant-size', `${Math.max(10, Math.min(24, settings.assistantFontSize ?? settings.fontSize ?? 14))}px`);
  setCssVar('--elara-assistant-weight', String(settings.assistantFontWeight ?? 400));
  setCssVar('--elara-assistant-color', settings.assistantTextColor || '#f4f4f5');
}

export async function loadConfiguredFonts(settings: Partial<ElaraSettings>): Promise<FontLoadResult[]> {
  if (typeof document === 'undefined') return [];
  const configs = [
    { family: settings.userFontFamily, source: settings.userFontSource, weight: settings.userFontWeight },
    { family: settings.assistantFontFamily, source: settings.assistantFontSource, weight: settings.assistantFontWeight },
  ];
  const results: FontLoadResult[] = [];
  const urls = new Set<string>();
  for (const config of configs) {
    const family = config.family?.trim();
    if (!family || config.source !== 'google' || isSystemFontFamily(family)) continue;
    const href = family.startsWith('https://') ? family : buildGoogleFontsUrl(family, Number(config.weight || 400));
    if (!isSafeGoogleFontsUrl(href)) { results.push({ status: 'fallback', family }); continue; }
    if (urls.has(href)) continue;
    urls.add(href);
    results.push({ ...(await ensureStylesheet(href)), family });
  }
  try { localStorage.setItem(GOOGLE_FONT_FAMILIES_KEY, JSON.stringify(configs)); } catch { /* best effort */ }
  return results;
}

export async function applyTypographySettings(settings: Partial<ElaraSettings>): Promise<void> { applyTypography(settings); await loadConfiguredFonts(settings); }
export function clearConfiguredFontStyles(): void { if (typeof document !== 'undefined') document.querySelectorAll(`link[${FONT_LINK_MARKER}]`).forEach((node) => node.remove()); }
