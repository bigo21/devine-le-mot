import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { LanguagePreference } from '@/lib/i18n';
import { persistStorage } from '@/lib/storage';
import type { WordFont } from '@/ui/tokens';

export type Sensitivity = 'low' | 'normal' | 'high';
export type RoundDuration = 30 | 60 | 90 | 120;

export type Settings = {
  language: LanguagePreference;
  sound: boolean;
  /** Volume des sons du jeu, de 0 à 1. */
  volume: number;
  haptics: boolean;
  sensitivity: Sensitivity;
  tapMode: boolean;
  defaultDuration: RoundDuration;
  reduceMotion: boolean;
  /** Police du mot affiché pendant la partie. */
  wordFont: WordFont;
  hasSeenOnboarding: boolean;
};

type SettingsStore = Settings & {
  update: (patch: Partial<Settings>) => void;
};

export const defaultSettings: Settings = {
  language: 'system',
  sound: true,
  volume: 1,
  haptics: true,
  sensitivity: 'normal',
  tapMode: false,
  defaultDuration: 60,
  reduceMotion: false,
  wordFont: 'expressive',
  hasSeenOnboarding: false,
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      update: (patch) => set(patch),
    }),
    {
      name: 'settings',
      version: 1,
      storage: persistStorage,
      partialize: ({ update: _update, ...settings }) => settings,
    },
  ),
);
