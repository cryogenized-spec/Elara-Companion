import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { ElaraSettings } from '../../types';

export type SettingsControllerArgs = {
  settings: ElaraSettings;
  setSettings: Dispatch<SetStateAction<ElaraSettings>>;
};

export function useSettingsController({ settings, setSettings }: SettingsControllerArgs) {
  const theme: 'dark' | 'light' = settings.theme || 'dark';

  useEffect(() => {
    if (theme === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  }, [theme]);

  const handleSaveSettings = (newSettings: ElaraSettings) => {
    setSettings(newSettings);
  };

  const handleToggleTheme = () => {
    const nextTheme: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setSettings({ ...settings, theme: nextTheme });
  };

  return { theme, handleSaveSettings, handleToggleTheme };
}
