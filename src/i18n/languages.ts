export const SUPPORTED_LANGUAGES = ['en', 'es'] as const

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: AppLanguage = 'en'

export const LANGUAGE_STORAGE_KEY = 'koltto_language'

export const LANGUAGE_OPTIONS: { value: AppLanguage; labelKey: string }[] = [
  { value: 'en', labelKey: 'settings.languageEnglish' },
  { value: 'es', labelKey: 'settings.languageSpanish' },
]

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'es'
}

export function normalizeLanguage(value: unknown): AppLanguage {
  if (typeof value === 'string') {
    const base = value.toLowerCase().split('-')[0]
    if (isAppLanguage(base)) return base
  }
  return DEFAULT_LANGUAGE
}
