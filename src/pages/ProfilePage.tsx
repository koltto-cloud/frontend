import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useTranslation } from 'react-i18next'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
import {
  intlLocale,
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  type AppLanguage,
} from '@/i18n/languages'

type TotpStatus = { enabled: boolean }
type TotpSetup = { provisioning_uri: string; secret: string }

function formatWhen(value: string | undefined, empty: string, locale: string): string {
  if (!value) return empty
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString(locale)
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { user, refreshSession } = useAuth()
  const { language, setLanguage } = useLanguage()
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpError, setTotpError] = useState('')
  const [totpSuccess, setTotpSuccess] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [setup, setSetup] = useState<TotpSetup | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [totpBusy, setTotpBusy] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(language)
  const [languageError, setLanguageError] = useState('')
  const [languageSuccess, setLanguageSuccess] = useState('')
  const [languageBusy, setLanguageBusy] = useState(false)

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name)
      setLastName(user.last_name)
    }
  }, [user])

  useEffect(() => {
    setSelectedLanguage(language)
  }, [language])

  const totpStatus = useAsyncData<TotpStatus>(
    () => apiRequest('/api/v1/auth/totp/totp/status'),
    [],
  )

  const totpEnabled = totpStatus.data?.enabled === true
  const toggleOn = totpEnabled || enrolling
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || '?'
  const empty = t('common.emDash')
  const locale = intlLocale(i18n.resolvedLanguage)

  useEffect(() => {
    if (!setup?.provisioning_uri) {
      setQrDataUrl('')
      return
    }
    let cancelled = false
    void QRCode.toDataURL(setup.provisioning_uri, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [setup?.provisioning_uri])

  const clearEnrollment = () => {
    setEnrolling(false)
    setSetup(null)
    setQrDataUrl('')
    setTotpCode('')
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    try {
      await apiRequest('/api/v1/identity/users/me', {
        method: 'PUT',
        body: { first_name: firstName, last_name: lastName },
      })
      setProfileSuccess(t('settings.profileUpdated'))
      await refreshSession()
    } catch (err) {
      setProfileError(formatApiError(err))
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    try {
      await apiRequest('/api/v1/identity/users/me/password', {
        method: 'PUT',
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
      })
      setPasswordSuccess(t('settings.passwordUpdated'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(formatApiError(err))
    }
  }

  const handleLanguageUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLanguageError('')
    setLanguageSuccess('')
    setLanguageBusy(true)
    try {
      const result = await setLanguage(normalizeLanguage(selectedLanguage))
      setLanguageSuccess(
        result === 'saved' ? t('settings.languageUpdated') : t('settings.languageSavedLocally'),
      )
    } catch (err) {
      setLanguageError(formatApiError(err))
    } finally {
      setLanguageBusy(false)
    }
  }

  const handleTotpToggle = async (checked: boolean) => {
    setTotpError('')
    setTotpSuccess('')
    if (checked) {
      if (totpEnabled) return
      setTotpBusy(true)
      setEnrolling(true)
      try {
        const data = await apiRequest<TotpSetup>('/api/v1/auth/totp/totp/setup', {
          method: 'POST',
        })
        setSetup(data)
      } catch (err) {
        setTotpError(formatApiError(err))
        clearEnrollment()
      } finally {
        setTotpBusy(false)
      }
      return
    }

    setTotpBusy(true)
    try {
      if (totpEnabled || setup) {
        await apiRequest('/api/v1/auth/totp/totp/disable', { method: 'DELETE' })
      }
      totpStatus.setData({ enabled: false })
      clearEnrollment()
      if (totpEnabled) setTotpSuccess(t('settings.totpDisabled'))
    } catch (err) {
      setTotpError(formatApiError(err))
    } finally {
      setTotpBusy(false)
    }
  }

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setTotpError('')
    setTotpSuccess('')
    setTotpBusy(true)
    try {
      await apiRequest('/api/v1/auth/totp/totp/verify', {
        method: 'POST',
        body: { code: totpCode },
      })
      totpStatus.setData({ enabled: true })
      clearEnrollment()
      setTotpSuccess(t('settings.totpEnabledSuccess'))
    } catch (err) {
      setTotpError(formatApiError(err))
    } finally {
      setTotpBusy(false)
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="page-title">{t('settings.title')}</h1>
        <p className="page-lead">{t('settings.lead')}</p>
      </header>

      <section className="card settings-card settings-account">
        {user ? (
          <div className="identity-panel">
            <div className="identity-hero">
              <div className="identity-avatar" aria-hidden="true">
                {initials}
              </div>
              <div className="identity-hero-copy">
                <div className="identity-title-row">
                  <p className="identity-name">
                    {user.first_name} {user.last_name}
                  </p>
                  <div className="identity-badges">
                    <span
                      className={`badge ${user.account_status === 'active' ? 'badge-success' : 'badge-neutral'}`}
                    >
                      {user.account_status}
                    </span>
                    <span className="badge badge-neutral">{user.user_type}</span>
                  </div>
                </div>
                <p className="identity-email">{user.email}</p>
              </div>
            </div>

            <dl className="identity-details">
              <div className="identity-detail identity-detail--wide">
                <dt>{t('settings.userId')}</dt>
                <dd className="mono" title={user.user_id}>
                  {user.user_id}
                </dd>
              </div>
              <div className="identity-detail">
                <dt>{t('settings.firstName')}</dt>
                <dd>{user.first_name || empty}</dd>
              </div>
              <div className="identity-detail">
                <dt>{t('settings.lastName')}</dt>
                <dd>{user.last_name || empty}</dd>
              </div>
              <div className="identity-detail">
                <dt>{t('settings.email')}</dt>
                <dd>{user.email}</dd>
              </div>
              <div className="identity-detail">
                <dt>{t('settings.accountStatus')}</dt>
                <dd>{user.account_status}</dd>
              </div>
              <div className="identity-detail">
                <dt>{t('settings.userType')}</dt>
                <dd>{user.user_type}</dd>
              </div>
              <div className="identity-detail">
                <dt>{t('settings.created')}</dt>
                <dd>{formatWhen(user.created_at, empty, locale)}</dd>
              </div>
              <div className="identity-detail">
                <dt>{t('settings.updated')}</dt>
                <dd>{formatWhen(user.updated_at, empty, locale)}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="loading">{t('settings.loadingProfile')}</p>
        )}
      </section>

      <div className="settings-grid">
        <section className="card settings-card">
          <div className="settings-card-head">
            <h2>{t('settings.updateProfile')}</h2>
          </div>
          <Alert type="error">{profileError}</Alert>
          <Alert type="success">{profileSuccess}</Alert>
          <form className="settings-form" onSubmit={(e) => void handleProfileUpdate(e)}>
            <div className="form-row form-row--2">
              <div className="form-field">
                <label htmlFor="profile-first-name">{t('settings.firstName')}</label>
                <input
                  id="profile-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="profile-last-name">{t('settings.lastName')}</label>
                <input
                  id="profile-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {t('common.save')}
              </button>
            </div>
          </form>
        </section>

        <section className="card settings-card">
          <div className="settings-card-head">
            <h2>{t('settings.language')}</h2>
          </div>
          <p className="page-lead" style={{ marginTop: 0 }}>
            {t('settings.languageLead')}
          </p>
          <Alert type="error">{languageError}</Alert>
          <Alert type="success">{languageSuccess}</Alert>
          <form className="settings-form" onSubmit={(e) => void handleLanguageUpdate(e)}>
            <div className="form-field">
              <label htmlFor="profile-language">{t('settings.languageLabel')}</label>
              <select
                id="profile-language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(normalizeLanguage(e.target.value))}
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={languageBusy}>
                {t('settings.saveLanguage')}
              </button>
            </div>
          </form>
        </section>

        <section className="card settings-card">
          <div className="settings-card-head">
            <h2>{t('settings.password')}</h2>
          </div>
          <Alert type="error">{passwordError}</Alert>
          <Alert type="success">{passwordSuccess}</Alert>
          <form className="settings-form" onSubmit={(e) => void handlePasswordUpdate(e)}>
            <div className="form-field">
              <label htmlFor="profile-current-password">{t('settings.currentPassword')}</label>
              <input
                id="profile-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="form-row form-row--2">
              <div className="form-field">
                <label htmlFor="profile-new-password">{t('settings.newPassword')}</label>
                <input
                  id="profile-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="form-field">
                <label htmlFor="profile-confirm-password">{t('settings.confirmNewPassword')}</label>
                <input
                  id="profile-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {t('settings.updatePassword')}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="card settings-card">
        <div className="settings-card-head">
          <h2>{t('settings.authenticator')}</h2>
          <span className={`badge ${totpEnabled ? 'badge-success' : 'badge-neutral'}`}>
            {totpEnabled ? t('common.enabled') : t('common.off')}
          </span>
        </div>
        <Alert type="error">{totpStatus.error || totpError}</Alert>
        <Alert type="success">{totpSuccess}</Alert>

        <label className="toggle-row">
          <span className="toggle-label">
            {totpEnabled ? t('settings.totpEnabled') : t('settings.enableTotp')}
          </span>
          <input
            type="checkbox"
            className="toggle-input"
            role="switch"
            checked={toggleOn}
            disabled={totpBusy || totpStatus.loading}
            onChange={(e) => void handleTotpToggle(e.target.checked)}
          />
          <span className="toggle-track" aria-hidden="true" />
        </label>

        {enrolling && setup ? (
          <div className="totp-enroll">
            <div className="totp-enroll-copy">
              <p className="totp-enroll-hint">{t('settings.totpEnrollHint')}</p>
              <div className="form-field">
                <label>{t('settings.secretManual')}</label>
                <code className="totp-secret">{setup.secret}</code>
              </div>
              <form className="settings-form" onSubmit={(e) => void handleTotpVerify(e)}>
                <div className="form-field">
                  <label htmlFor="profile-totp-code">{t('settings.verifyCode')}</label>
                  <input
                    id="profile-totp-code"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={totpBusy}>
                    {t('settings.confirmEnable')}
                  </button>
                </div>
              </form>
            </div>
            {qrDataUrl ? (
              <img
                className="totp-qr"
                src={qrDataUrl}
                alt={t('settings.totpQrAlt')}
                width={200}
                height={200}
              />
            ) : (
              <p className="muted">{t('settings.generatingQr')}</p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  )
}
