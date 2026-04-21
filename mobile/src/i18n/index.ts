import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { storage, StorageKey } from '@/lib/storage/mmkv';

import ru from './locales/ru.json';
import kz from './locales/kz.json';
import en from './locales/en.json';

export type AppLocale = 'ru' | 'kz' | 'en';

const SUPPORTED: AppLocale[] = ['ru', 'kz', 'en'];
const DEFAULT: AppLocale = 'ru';

function detectInitialLocale(): AppLocale {
  const stored = storage.getString(StorageKey.Lang) as AppLocale | undefined;
  if (stored && SUPPORTED.includes(stored)) return stored;

  const system = Localization.getLocales()[0]?.languageCode ?? '';
  if (system === 'ru' || system === 'kk' || system === 'kz') return system === 'ru' ? 'ru' : 'kz';
  if (system === 'en') return 'en';
  return DEFAULT;
}

let initialized = false;

export function initI18n(): typeof i18n {
  if (initialized) return i18n;
  initialized = true;

  const lng = detectInitialLocale();

  i18n.use(initReactI18next).init({
    resources: {
      ru: { translation: ru },
      kz: { translation: kz },
      en: { translation: en },
    },
    lng,
    fallbackLng: DEFAULT,
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  return i18n;
}

export function setLocale(locale: AppLocale): void {
  storage.set(StorageKey.Lang, locale);
  i18n.changeLanguage(locale);
}

export function getLocale(): AppLocale {
  return (i18n.language as AppLocale) ?? DEFAULT;
}

export default i18n;
