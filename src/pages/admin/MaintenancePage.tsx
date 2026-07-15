import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useClientPagination } from '@/hooks/useClientPagination'
import { Alert } from '@/components/Alert'
import PaginationControls from '@/components/PaginationControls'

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

interface CancelResult {
  cancelled_inventory_runs: number
  aborted_jobs: Record<string, string>
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

function rowKey(s: ActiveSync): string {
  return s.sync_run_id ?? s.job_id ?? `${s.sync_type}-${s.company_id}-${s.created_at}`
}

export default function MaintenancePage() {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null)
  const [activeSyncs, setActiveSyncs] = useState<ActiveSync[] | null>(null)
  const [companyFilter, setCompanyFilter] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const load = useCallback(async () => {
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

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of activeSyncs ?? []) {
      if (s.company_id) {
        map.set(s.company_id, s.company_name ?? s.company_id.slice(0, 8))
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [activeSyncs])

  const filteredSyncs = useMemo(() => {
    const rows = activeSyncs ?? []
    if (!companyFilter) return rows
    return rows.filter((s) => s.company_id === companyFilter)
  }, [activeSyncs, companyFilter])

  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(filteredSyncs)

  useEffect(() => {
    setPage(1)
  }, [companyFilter, setPage])

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
          ? 'New OCI syncs are paused (usage, monitoring, inventory, …). In-flight jobs will finish. Cancel open syncs below if you need a faster drain before redeploy.'
          : 'OCI syncs are open again.',
      )
      await load()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const cancelOne = async (s: ActiveSync) => {
    const key = rowKey(s)
    setCancelling(key)
    setError('')
    setSuccess('')
    try {
      const body =
        s.sync_type === 'inventory' && s.sync_run_id && s.company_id
          ? { company_id: s.company_id, sync_run_id: s.sync_run_id }
          : { job_id: s.job_id }
      if (!body.job_id && !('sync_run_id' in body)) {
        throw new Error('Missing job or sync run id')
      }
      await apiRequest<CancelResult>('/api/v1/admin/maintenance/active-syncs/cancel', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setSuccess(`Cancelled ${syncTypeLabel(s.sync_type)}.`)
      await load()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setCancelling(null)
    }
  }

  const cancelAll = async () => {
    if (
      !confirm(
        'Cancel all open inventory runs and abort all queued/in-progress sync jobs across every company?',
      )
    ) {
      return
    }
    setCancelling('all')
    setError('')
    setSuccess('')
    try {
      const result = await apiRequest<CancelResult>(
        '/api/v1/admin/maintenance/active-syncs/cancel-all',
        { method: 'POST' },
      )
      const aborted = Object.keys(result.aborted_jobs).length
      setSuccess(
        `Cancelled ${result.cancelled_inventory_runs} inventory run(s) and signaled abort on ${aborted} ARQ job(s).`,
      )
      await load()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setCancelling(null)
    }
  }

  const busy = saving || cancelling != null

  return (
    <div className="page">
      <h1>Maintenance</h1>
      <p className="page-lead">
        Pause <strong>new</strong> OCI sync starts (usage, monitoring, inventory, compartments, and
        ad-hoc resource syncs) before a worker redeploy. Jobs already running or queued keep going
        until they finish — or cancel them below to drain faster.
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
            disabled={busy || status?.syncs_paused === true}
            onClick={() => void setPaused(true)}
          >
            Pause new syncs
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy || status?.syncs_paused === false}
            onClick={() => void setPaused(false)}
          >
            Resume syncs
          </button>
        </div>
      </div>

      <section style={{ marginTop: 32 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0 }}>Open syncs</h2>
          <button
            type="button"
            className="btn"
            disabled={busy || (activeSyncs?.length ?? 0) === 0}
            onClick={() => void cancelAll()}
          >
            {cancelling === 'all' ? 'Cancelling…' : 'Cancel all'}
          </button>
        </div>
        <p className="page-lead" style={{ marginTop: 4 }}>
          Inventory runs plus usage / monitoring / other ARQ jobs. Refreshes every {POLL_MS / 1000}
          s. Safe to redeploy the worker when this list is empty (after pausing new syncs).
        </p>

        <div className="filters" style={{ marginTop: 12 }}>
          <label>
            Company
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              disabled={activeSyncs === null}
            >
              <option value="">All companies</option>
              {companyOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {activeSyncs === null ? (
          <p>Loading…</p>
        ) : filteredSyncs.length === 0 ? (
          <p>
            <strong>None open</strong>
            {companyFilter ? ' for this company' : ''} — queue is clear for a worker redeploy.
          </p>
        ) : (
          <>
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((s) => {
                    const key = rowKey(s)
                    return (
                      <tr key={key}>
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
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={busy}
                            onClick={() => void cancelOne(s)}
                          >
                            {cancelling === key ? '…' : 'Cancel'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={page}
              pageSize={pageSize}
              itemCount={pageItems.length}
              totalItems={totalItems}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={busy}
            />
          </>
        )}
      </section>
    </div>
  )
}
