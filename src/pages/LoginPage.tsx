import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatApiError, login, loginTotp } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { Alert } from '@/components/Alert'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { setSessionTokens, refreshSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success] = useState(
    () => (location.state as { message?: string } | null)?.message ?? '',
  )
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      if (data.requires_totp && data.temp_token) {
        setTempToken(data.temp_token)
        return
      }
      if (!data.access_token) {
        setError(t('auth.noAccessToken'))
        return
      }
      setSessionTokens(data.access_token, data.refresh_token)
      const ok = await refreshSession()
      if (!ok) {
        setError(t('auth.sessionLoadFailed'))
        return
      }
      navigate('/')
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tempToken) return
    setError('')
    setLoading(true)
    try {
      const data = await loginTotp(tempToken, totpCode)
      if (!data.access_token) {
        setError(t('auth.totpNoAccessToken'))
        return
      }
      setSessionTokens(data.access_token, data.refresh_token)
      const ok = await refreshSession()
      if (!ok) {
        setError(t('auth.totpSessionLoadFailed'))
        return
      }
      navigate('/')
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <header className="auth-header">
          <p className="auth-brand">KÖLTTÖ</p>
          <p className="auth-tagline">{t('auth.tagline')}</p>
        </header>

        <div className="auth-card">
          <h1>{tempToken ? t('auth.twoFactor') : t('auth.welcomeBack')}</h1>
          <Alert type="error">{error}</Alert>
          <Alert type="success">{success}</Alert>

          {!tempToken ? (
            <form onSubmit={(e) => void handleLogin(e)}>
              <div className="form-field">
                <label htmlFor="email">{t('auth.email')}</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
              <div className="form-field">
                <label htmlFor="password">{t('auth.password')}</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                  {loading ? t('auth.signingIn') : t('auth.signIn')}
                </button>
              </div>
              <p className="auth-footer-link">
                <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={(e) => void handleTotp(e)}>
              <p className="auth-hint">{t('auth.totpHint')}</p>
              <div className="form-field">
                <label htmlFor="totp">{t('auth.totpCode')}</label>
                <input
                  id="totp"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  placeholder="123456"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setTempToken(null)}>
                  {t('common.back')}
                </button>
                <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                  {t('auth.verify')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
