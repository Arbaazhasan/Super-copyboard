import { useState, useEffect } from 'react';
import { AppSettings } from '../lib/types';

const SETTINGS_KEY = 'copyboard_user_settings';

const DEFAULT_SETTINGS: AppSettings = {
  historyLimit: 500,
  autoDeleteDuration: '7d',
  ignorePasswords: true,
  theme: 'dark',
  shortcut: 'Super + V',
  soundEnabled: true,
  pasteMethod: 'auto',
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }

    // Apply theme class to documentElement
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting, setSettings };
}
