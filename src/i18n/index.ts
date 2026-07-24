import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
} from './languages'

const initialLanguage = normalizeLanguage(
  typeof localStorage !== 'undefined' ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null,
)

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  const normalized = normalizeLanguage(lng)
  document.documentElement.lang = normalized
  localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized)
})

document.documentElement.lang = initialLanguage

export default i18n
