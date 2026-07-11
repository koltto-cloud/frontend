import { useEffect, useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
import JsonViewer from '@/components/JsonViewer'

export default function ProfilePage() {
  const { user, refreshSession } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpError, setTotpError] = useState('')
  const [totpSuccess, setTotpSuccess] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name)
      setLastName(user.last_name)
    }
  }, [user])

  const totpSetup = useAsyncData<Record<string, unknown>>(
    () => apiRequest('/api/v1/auth/totp/totp/setup', { method: 'POST' }),
    [],
  )

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    try {
      await apiRequest('/api/v1/identity/users/me', {
        method: 'PUT',
        body: { first_name: firstName, last_name: lastName },
      })
      setProfileSuccess('Profile updated.')
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
      setPasswordSuccess('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(formatApiError(err))
    }
  }

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setTotpError('')
    setTotpSuccess('')
    try {
      await apiRequest('/api/v1/auth/totp/totp/verify', {
        method: 'POST',
        body: { code: totpCode },
      })
      setTotpSuccess('TOTP enabled.')
      setTotpCode('')
    } catch (err) {
      setTotpError(formatApiError(err))
    }
  }

  const handleTotpDisable = async () => {
    setTotpError('')
    setTotpSuccess('')
    try {
      await apiRequest('/api/v1/auth/totp/totp/disable', { method: 'POST' })
      setTotpSuccess('TOTP disabled.')
    } catch (err) {
      setTotpError(formatApiError(err))
    }
  }

  return (
    <>
      <h1 className="page-title">Profile & TOTP</h1>

      <div className="card">
        <h2>Current user</h2>
        {user && <JsonViewer data={user} />}
      </div>

      <div className="card">
        <h2>Update profile</h2>
        <Alert type="error">{profileError}</Alert>
        <Alert type="success">{profileSuccess}</Alert>
        <form className="inline-form" onSubmit={(e) => void handleProfileUpdate(e)}>
          <div className="form-field">
            <label>First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Last name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Change password</h2>
        <Alert type="error">{passwordError}</Alert>
        <Alert type="success">{passwordSuccess}</Alert>
        <form className="inline-form" onSubmit={(e) => void handlePasswordUpdate(e)}>
          <div className="form-field">
            <label>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-field">
            <label>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-field">
            <label>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Update password
          </button>
        </form>
      </div>

      <div className="card">
        <h2>TOTP setup</h2>
        <Alert type="error">{totpSetup.error || totpError}</Alert>
        <Alert type="success">{totpSuccess}</Alert>
        {totpSetup.data != null && <JsonViewer data={totpSetup.data} />}
        <form className="inline-form" onSubmit={(e) => void handleTotpVerify(e)}>
          <div className="form-field">
            <label>Verify TOTP code</label>
            <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Enable TOTP
            </button>
            <button type="button" className="btn btn-danger" onClick={() => void handleTotpDisable()}>
              Disable TOTP
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
