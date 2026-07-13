import { useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useOciCompartments } from '@/hooks/useOciCompartments'
import { useOciJobTracker } from '@/hooks/useOciJob'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
import DataTable from '@/components/DataTable'
import OciJobStatusPanel from '@/components/OciJobStatusPanel'

const RESOURCE_TYPES = [
  { value: 'compute', label: 'Compute' },
  { value: 'block_storage', label: 'Block storage' },
  { value: 'object_storage', label: 'Object storage' },
  { value: 'file_storage', label: 'File storage' },
  { value: 'load_balancer', label: 'Load balancer' },
] as const

function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 7)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

interface MonitoringMetric {
  id: string
  metric_date: string
  tenancy_ocid: string
  compartment_id: string | null
  resource_id: string
  resource_type: string
  namespace: string
  metric_name: string
  mean_value: number | null
  max_value: number | null
  min_value: number | null
  unit: string | null
  synced_at: string
}

export default function MonitoringPage() {
  const { activeCompany, connection } = useAuth()
  const defaults = defaultDateRange()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [compartmentId, setCompartmentId] = useState('')
  const [resourceType, setResourceType] = useState<string>(RESOURCE_TYPES[0].value)
  const [metricName, setMetricName] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [actionError, setActionError] = useState('')
  const [msg, setMsg] = useState('')
  const [listKey, setListKey] = useState(0)

  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id

  const { compartments, loading: compartmentsLoading } = useOciCompartments(companyId, connectionId)

  const {
    job,
    polling,
    error: jobError,
    trackSyncResponse,
    checkJob,
    dismiss,
  } = useOciJobTracker()

  const base =
    companyId && connectionId
      ? `/api/v1/cloud/oci/monitoring/${companyId}/connections/${connectionId}/monitoring`
      : null

  const { data, error, loading, reload } = useAsyncData(
    () => {
      if (!base || listKey === 0) return Promise.resolve([])
      return apiRequest<MonitoringMetric[]>(base, {
        query: {
          resource_type: resourceType || undefined,
          metric_name: metricName || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          limit: 200,
          offset: 0,
        },
      })
    },
    [base, listKey],
  )

  const handleSync = async () => {
    if (!base) return
    if (!compartmentId) {
      setActionError('Select a compartment to sync.')
      return
    }
    setActionError('')
    setMsg('')
    setSyncing(true)
    try {
      const res = await apiRequest(`${base}/sync`, {
        method: 'POST',
        body: {
          start_date: startDate,
          end_date: endDate,
          compartment_id: compartmentId,
          resource_type: resourceType,
        },
      })
      if (trackSyncResponse(res, { onComplete: () => setListKey((k) => k + 1) })) {
        setMsg('Monitoring sync queued.')
      } else {
        setMsg('Monitoring sync triggered.')
        setListKey((k) => k + 1)
      }
    } catch (err) {
      setActionError(formatApiError(err))
    } finally {
      setSyncing(false)
    }
  }

  const handleLoad = () => {
    setActionError('')
    setListKey((k) => k + 1)
  }

  if (!companyId || !connectionId) {
    return (
      <>
        <h1 className="page-title">OCI Monitoring</h1>
        <p className="empty">Select a company and connection from the top bar.</p>
      </>
    )
  }

  const rows = ((data ?? []) as MonitoringMetric[]).map((m) => ({
    metric_date: m.metric_date,
    resource_type: m.resource_type,
    metric_name: m.metric_name,
    resource_id: m.resource_id,
    mean: m.mean_value,
    max: m.max_value,
    min: m.min_value,
    unit: m.unit,
    compartment_id: m.compartment_id,
    synced_at: m.synced_at,
  }))

  return (
    <>
      <h1 className="page-title">OCI Monitoring</h1>

      <div className="filters">
        <label>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label>
          Compartment
          <select
            value={compartmentId}
            onChange={(e) => setCompartmentId(e.target.value)}
            disabled={compartmentsLoading}
          >
            <option value="">Select compartment…</option>
            {compartments.map((c) => (
              <option key={c.compartment_ocid} value={c.compartment_ocid}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Resource type
          <select value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
            {RESOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Metric name
          <input
            type="text"
            value={metricName}
            placeholder="optional filter"
            onChange={(e) => setMetricName(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={syncing || !compartmentId}
          onClick={() => void handleSync()}
        >
          {syncing ? 'Queueing…' : 'Sync metrics'}
        </button>
        <button type="button" className="btn" disabled={loading} onClick={handleLoad}>
          {loading ? 'Loading…' : 'Load metrics'}
        </button>
        {listKey > 0 && (
          <button type="button" className="btn" onClick={() => void reload()}>
            Refresh
          </button>
        )}
      </div>

      <Alert type="error">{actionError || error}</Alert>
      <Alert type="success">{msg}</Alert>
      <Alert type="info">
        Sync pulls metrics from OCI for one compartment + resource type. Load metrics to view stored rows.
        Sync compartments on Resources first if the compartment list is empty.
      </Alert>

      <OciJobStatusPanel
        job={job}
        polling={polling}
        error={jobError}
        onDismiss={dismiss}
        onCheckJob={checkJob}
      />

      {listKey === 0 ? (
        <p className="empty">Click Load metrics to fetch stored monitoring data.</p>
      ) : loading ? (
        <p className="loading">Loading…</p>
      ) : (
        <DataTable rows={rows as Record<string, unknown>[]} />
      )}
    </>
  )
}
