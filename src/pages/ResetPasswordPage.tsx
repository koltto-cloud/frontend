import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest, formatApiError } from '@/api/client'
import { Alert } from '@/components/Alert'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await apiRequest('/api/v1/auth/password-reset/confirm', {
        method: 'POST',
        auth: false,
        body: { token, new_password: password, confirm_password: password },
      })
      setSuccess('Password updated. You can now log in.')
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
          <h1>Reset password</h1>
          <Alert type="error">{error}</Alert>
          <Alert type="success">{success}</Alert>
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="form-field">
              <label htmlFor="token">Reset token</label>
              <input id="token" value={token} onChange={(e) => setToken(e.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="password">New password</label>
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
                Reset password
              </button>
            </div>
            <p className="auth-footer-link">
              <Link to="/login">Back to login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
