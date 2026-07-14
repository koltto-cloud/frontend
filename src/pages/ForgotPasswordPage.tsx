import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, formatApiError } from '@/api/client'
import { Alert } from '@/components/Alert'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await apiRequest('/api/v1/auth/password-reset/request', {
        method: 'POST',
        auth: false,
        body: { email },
      })
      setSuccess('If the email exists, a reset link was sent.')
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
          <p className="auth-tagline">Cloud cost & inventory</p>
        </header>
        <div className="auth-card">
          <h1>Forgot password</h1>
          <Alert type="error">{error}</Alert>
          <Alert type="success">{success}</Alert>
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                Send reset link
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
