import { useCallback, useEffect, useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { Alert } from '@/components/Alert'

interface MaintenanceStatus {
  syncs_paused: boolean
}

export default function MaintenancePage() {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await apiRequest<MaintenanceStatus>('/api/v1/admin/maintenance')
      setStatus(data)
    } catch (err) {
      setError(formatApiError(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setPaused = async (syncs_paused: boolean) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const data = await apiRequest<MaintenanceStatus>('/api/v1/admin/maintenance', {
        method: 'PUT',
        body: JSON.stringify({ syncs_paused }),
      })
      setStatus(data)
      setSuccess(
        data.syncs_paused
          ? 'New OCI syncs are paused. In-flight jobs will finish. Redeploy when the queue is quiet.'
          : 'OCI syncs are open again.',
      )
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h1>Maintenance</h1>
      <p className="page-lead">
        Pause <strong>new</strong> OCI sync starts (usage, monitoring, inventory) before a worker
        redeploy. Jobs already running or queued keep going until they finish.
      </p>

      {error ? <Alert type="error">{error}</Alert> : null}
      {success ? <Alert type="success">{success}</Alert> : null}

      <div className="card" style={{ maxWidth: 520, marginTop: 16 }}>
        <p>
          Status:{' '}
          <strong>
            {status == null ? 'Loading…' : status.syncs_paused ? 'Syncs paused' : 'Syncs open'}
          </strong>
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || status?.syncs_paused === true}
            onClick={() => void setPaused(true)}
          >
            Pause new syncs
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={saving || status?.syncs_paused === false}
            onClick={() => void setPaused(false)}
          >
            Resume syncs
          </button>
        </div>
      </div>
    </div>
  )
}
