/**
 * i18n bootstrap.
 *
 * Initialises i18next + react-i18next with bundled locale resources and picks
 * the initial language from the device locale (falling back to English).
 * Import this module once, early in the app entry point.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';

/** Locale resources bundled with the app. */
export const resources = {
  en: { translation: en },
} as const;

/** Languages the app currently ships translations for. */
export const supportedLanguages = ['en'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

/** Language used when the device locale is not supported. */
export const fallbackLanguage: SupportedLanguage = 'en';

/**
 * Pick the best supported language for the current device, falling back to
 * {@link fallbackLanguage}. Defensive against environments where the native
 * localization module is unavailable (e.g. tests).
 */
export function detectDeviceLanguage(): SupportedLanguage {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    return (supportedLanguages as readonly string[]).includes(code ?? '')
      ? (code as SupportedLanguage)
      : fallbackLanguage;
  } catch {
    return fallbackLanguage;
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: fallbackLanguage,
  defaultNS: 'translation',
  ns: ['translation'],
  interpolation: {
    // React already escapes values, so i18next must not double-escape.
    escapeValue: false,
  },
  returnNull: false,
  react: {
    // Resources are bundled, so i18n is ready synchronously — no Suspense.
    useSuspense: false,
  },
});

export default i18n;
