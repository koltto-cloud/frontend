import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiRequest, formatApiError } from '@/api/client'
import { Alert } from '@/components/Alert'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiRequest('/api/v1/auth/password-reset/confirm', {
        method: 'POST',
        auth: false,
        body: { token, new_password: password, confirm_password: password },
      })
      navigate('/login', {
        replace: true,
        state: { message: t('auth.passwordUpdatedLogin') },
      })
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
          <h1>{t('auth.resetPasswordTitle')}</h1>
          <Alert type="error">{error}</Alert>
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="form-field">
              <label htmlFor="token">{t('auth.resetToken')}</label>
              <input id="token" value={token} onChange={(e) => setToken(e.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="password">{t('auth.newPassword')}</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                {t('auth.resetPassword')}
              </button>
            </div>
            <p className="auth-footer-link">
              <Link to="/login">{t('auth.backToLogin')}</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
