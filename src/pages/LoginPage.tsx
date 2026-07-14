import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatApiError, login, loginTotp } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { Alert } from '@/components/Alert'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setSessionTokens, refreshSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [error, setError] = useState('')
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
        setError('Login succeeded but no access token was returned.')
        return
      }
      setSessionTokens(data.access_token, data.refresh_token)
      const ok = await refreshSession()
      if (!ok) {
        setError('Logged in but could not load your session. Check the browser console or Railway logs.')
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
        setError('TOTP verified but no access token was returned.')
        return
      }
      setSessionTokens(data.access_token, data.refresh_token)
      const ok = await refreshSession()
      if (!ok) {
        setError('TOTP verified but could not load your session.')
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
          <p className="auth-tagline">Cloud cost & inventory tester</p>
        </header>

        <div className="auth-card">
          <h1>{tempToken ? 'Two-factor verification' : 'Sign in'}</h1>
          <Alert type="error">{error}</Alert>

          {!tempToken ? (
            <form onSubmit={(e) => void handleLogin(e)}>
              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="you@company.com"
                />
              </div>
              <div className="form-field">
                <label htmlFor="password">Password</label>
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
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </div>
              <p className="auth-footer-link">
                <Link to="/forgot-password">Forgot password?</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={(e) => void handleTotp(e)}>
              <p className="auth-hint">Enter the 6-digit code from your authenticator app.</p>
              <div className="form-field">
                <label htmlFor="totp">TOTP code</label>
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
                  Back
                </button>
                <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                  Verify
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
