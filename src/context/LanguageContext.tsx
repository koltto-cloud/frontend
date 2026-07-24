import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  getUserSettings,
  RequestError,
  updateUserSettings,
} from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  type AppLanguage,
} from '@/i18n/languages'

export type SaveLanguageResult = 'saved' | 'local'

interface LanguageContextValue {
  language: AppLanguage
  /** Apply language immediately; persist to API when authenticated. */
  setLanguage: (language: AppLanguage) => Promise<SaveLanguageResult>
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    normalizeLanguage(i18n.language),
  )

  const applyLanguage = useCallback(
    async (next: AppLanguage) => {
      setLanguageState(next)
      if (i18n.language !== next) await i18n.changeLanguage(next)
    },
    [i18n],
  )

  const userId = user?.user_id

  useEffect(() => {
    if (!isAuthenticated || !userId) return

    let cancelled = false
    void (async () => {
      try {
        const settings = await getUserSettings()
        if (cancelled) return
        await applyLanguage(normalizeLanguage(settings.language))
      } catch (err) {
        // Backend endpoint / table may not exist yet — keep local preference.
        if (!(err instanceof RequestError && (err.status === 404 || err.status === 501))) {
          console.error('Failed to load user language settings', err)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applyLanguage, isAuthenticated, userId])

  const setLanguage = useCallback(
    async (next: AppLanguage): Promise<SaveLanguageResult> => {
      const normalized = normalizeLanguage(next)
      await applyLanguage(normalized)

      if (!isAuthenticated) return 'local'

      try {
        await updateUserSettings({ language: normalized })
        return 'saved'
      } catch (err) {
        if (err instanceof RequestError && (err.status === 404 || err.status === 501)) {
          return 'local'
        }
        throw err
      }
    },
    [applyLanguage, isAuthenticated],
  )

  // Keep React state aligned if something else changes i18n language.
  useEffect(() => {
    const onChanged = (lng: string) => {
      setLanguageState(normalizeLanguage(lng))
    }
    i18n.on('languageChanged', onChanged)
    return () => {
      i18n.off('languageChanged', onChanged)
    }
  }, [i18n])

  return (
    <LanguageContext.Provider
      value={{
        language: language || DEFAULT_LANGUAGE,
        setLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
