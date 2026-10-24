import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './locales/en';
import { fr } from './locales/fr';

export const supportedLanguages = ['fr', 'en'] as const;
export type Language = (typeof supportedLanguages)[number];
export type LanguagePreference = Language | 'system';

export const resources = {
  fr: { translation: fr },
  en: { translation: en },
} as const;

/** Langue effective : préférence explicite, sinon langue du téléphone si gérée, sinon français. */
export function resolveLanguage(
  preference: LanguagePreference,
  deviceLanguageCodes: readonly (string | null)[],
): Language {
  if (preference !== 'system') return preference;
  const match = deviceLanguageCodes.find((code): code is Language =>
    supportedLanguages.includes(code as Language),
  );
  return match ?? 'fr';
}

export function deviceLanguageCodes(): (string | null)[] {
  return getLocales().map((locale) => locale.languageCode);
}

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage('system', deviceLanguageCodes()),
  fallbackLng: 'fr',
  // Ressources embarquées : initialisation synchrone, pas d'écran sans texte au démarrage.
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
