import { useCallback, useEffect, useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { Alert } from '@/components/Alert'

interface MaintenanceStatus {
  syncs_paused: boolean
}

interface ActiveSync {
  sync_type: string
  status: string
  company_id: string | null
  company_name: string | null
  connection_id: string | null
  connection_name: string | null
  sync_run_id: string | null
  job_id: string | null
  total_steps: number | null
  completed_steps: number | null
  failed_steps: number | null
  detail: string | null
  created_at: string | null
}

const POLL_MS = 10000

function syncTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    inventory: 'Inventory',
    oci_usage: 'Usage',
    oci_monitoring: 'Monitoring',
    oci_compartments: 'Compartments',
    oci_compute: 'Compute',
    oci_block_storage: 'Block storage',
    oci_object_storage: 'Object storage',
    oci_file_storage: 'File storage',
    oci_load_balancer: 'Load balancer',
  }
  return labels[type] ?? type
}

function progressLabel(s: ActiveSync): string {
  if (s.sync_type === 'inventory' && s.total_steps != null) {
    const done = (s.completed_steps ?? 0) + (s.failed_steps ?? 0)
    return `${done}/${s.total_steps}${s.failed_steps ? ` (${s.failed_steps} failed)` : ''}`
  }
  return s.detail ?? '—'
}

export default function MaintenancePage() {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null)
  const [activeSyncs, setActiveSyncs] = useState<ActiveSync[] | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const [maint, syncs] = await Promise.all([
        apiRequest<MaintenanceStatus>('/api/v1/admin/maintenance'),
        apiRequest<ActiveSync[]>('/api/v1/admin/maintenance/active-syncs'),
      ])
      setStatus(maint)
      setActiveSyncs(syncs)
    } catch (err) {
      setError(formatApiError(err))
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(timer)
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
          ? 'New OCI syncs are paused (usage, monitoring, inventory, …). In-flight jobs will finish. Redeploy when the list below is empty.'
          : 'OCI syncs are open again.',
      )
      await load()
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
        Pause <strong>new</strong> OCI sync starts (usage, monitoring, inventory, compartments, and
        ad-hoc resource syncs) before a worker redeploy. Jobs already running or queued keep going
        until they finish.
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

      <section style={{ marginTop: 32 }}>
        <h2>Open syncs</h2>
        <p className="page-lead" style={{ marginTop: 4 }}>
          Inventory runs plus usage / monitoring / other ARQ jobs across all customers. Refreshes
          every {POLL_MS / 1000}s. Safe to redeploy the worker when this list is empty (after
          pausing new syncs).
        </p>

        {activeSyncs === null ? (
          <p>Loading…</p>
        ) : activeSyncs.length === 0 ? (
          <p>
            <strong>None open</strong> — queue is clear for a worker redeploy.
          </p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Company</th>
                  <th>Connection</th>
                  <th>Status</th>
                  <th>Detail</th>
                  <th>Started / enqueued</th>
                </tr>
              </thead>
              <tbody>
                {activeSyncs.map((s) => (
                  <tr key={s.sync_run_id ?? s.job_id ?? `${s.sync_type}-${s.created_at}`}>
                    <td>{syncTypeLabel(s.sync_type)}</td>
                    <td>{s.company_name ?? s.company_id?.slice(0, 8) ?? '—'}</td>
                    <td>
                      {s.connection_name ??
                        (s.connection_id ? s.connection_id.slice(0, 8) : '—')}
                    </td>
                    <td>{s.status}</td>
                    <td>{progressLabel(s)}</td>
                    <td>
                      {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
