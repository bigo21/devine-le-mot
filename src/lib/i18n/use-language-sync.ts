import { useLocales } from 'expo-localization';
import { useEffect } from 'react';

import { useSettings } from '@/features/settings/store';

import i18n, { resolveLanguage } from './index';

/** Applique la langue choisie dans les réglages, ou suit celle du téléphone. */
export function useLanguageSync(): void {
  const preference = useSettings((s) => s.language);
  const locales = useLocales();

  useEffect(() => {
    const language = resolveLanguage(
      preference,
      locales.map((l) => l.languageCode),
    );
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [preference, locales]);
}
