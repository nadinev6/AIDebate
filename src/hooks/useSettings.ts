import { useState, useEffect } from 'react';

export interface AppSettings {
  theme: 'light' | 'dark';
  aiProvider: 'openai' | 'cerebras';
  openaiModel: string;
  cerebrasModel: string;
  temperature: number;
  maxTokens: number;
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  autoSave: boolean;
  markdownEnabled: boolean;
  showCitations: boolean;
  showTranscription: boolean;
  redisEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  aiProvider: 'openai',
  openaiModel: 'gpt-3.5-turbo',
  cerebrasModel: 'llama3.1-8b',
  temperature: 0.7,
  maxTokens: 500,
  voice: 'alloy',
  autoSave: true,
  markdownEnabled: true,
  showCitations: true,
  showTranscription: true,
  redisEnabled: false,
};

const STORAGE_KEY = 'ai-debate-settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch (e) {
        console.error('Failed to parse settings:', e);
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (settings.autoSave) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setHasUnsavedChanges(false);
    } else {
      setHasUnsavedChanges(true);
    }
  }, [settings]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setHasUnsavedChanges(false);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    setHasUnsavedChanges(false);
  };

  return {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    hasUnsavedChanges,
  };
}
