import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
import JsonViewer from '@/components/JsonViewer'

type TotpStatus = { enabled: boolean }
type TotpSetup = { provisioning_uri: string; secret: string }

export default function ProfilePage() {
  const { user, refreshSession } = useAuth()
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

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name)
      setLastName(user.last_name)
    }
  }, [user])

  const totpStatus = useAsyncData<TotpStatus>(
    () => apiRequest('/api/v1/auth/totp/totp/status'),
    [],
  )

  const totpEnabled = totpStatus.data?.enabled === true
  const toggleOn = totpEnabled || enrolling

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
      if (totpEnabled) setTotpSuccess('TOTP disabled.')
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
      setTotpSuccess('TOTP enabled.')
    } catch (err) {
      setTotpError(formatApiError(err))
    } finally {
      setTotpBusy(false)
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
        <h2>Authenticator (TOTP)</h2>
        <Alert type="error">{totpStatus.error || totpError}</Alert>
        <Alert type="success">{totpSuccess}</Alert>

        <label className="toggle-row">
          <span className="toggle-label">
            {totpEnabled ? 'TOTP is enabled' : 'Enable TOTP'}
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

        {enrolling && setup && (
          <div className="totp-enroll">
            <p className="totp-enroll-hint">
              Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
            </p>
            {qrDataUrl ? (
              <img className="totp-qr" src={qrDataUrl} alt="TOTP QR code" width={200} height={200} />
            ) : (
              <p className="muted">Generating QR code…</p>
            )}
            <div className="form-field">
              <label>Secret (manual entry)</label>
              <code className="totp-secret">{setup.secret}</code>
            </div>
            <form className="inline-form" onSubmit={(e) => void handleTotpVerify(e)}>
              <div className="form-field">
                <label>Verify code</label>
                <input
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={totpBusy}>
                Confirm & enable
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
