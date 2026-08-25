import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { ElaraSettings } from '../../types';

export type SettingsControllerArgs = {
  settings: ElaraSettings;
  setSettings: Dispatch<SetStateAction<ElaraSettings>>;
};

export function useSettingsController({ settings, setSettings }: SettingsControllerArgs) {
  const [theme, setTheme] = useState<'dark' | 'light'>(settings.theme || 'dark');

  useEffect(() => {
    if (theme === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  }, [theme]);

  const handleSaveSettings = (newSettings: ElaraSettings) => {
    setSettings(newSettings);
    setTheme(newSettings.theme);
  };

  const handleToggleTheme = () => {
    const nextTheme: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    const updatedSettings: ElaraSettings = { ...settings, theme: nextTheme };
    setSettings(updatedSettings);
  };

  return { theme, handleSaveSettings, handleToggleTheme };
}
