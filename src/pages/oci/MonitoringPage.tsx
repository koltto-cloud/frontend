import { useEffect, useState } from 'react'
import { apiRequest } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { MONITORING_RESOURCE_TYPES } from '@/oci/monitoring'
import { Alert } from '@/components/Alert'
import DataTable from '@/components/DataTable'
import PaginationControls, {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/components/PaginationControls'
import { Link } from 'react-router-dom'

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
  const [resourceType, setResourceType] = useState('')
  const [metricName, setMetricName] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id

  const base =
    companyId && connectionId
      ? `/api/v1/cloud/oci/monitoring/${companyId}/connections/${connectionId}/monitoring`
      : null

  const listKey = loaded
    ? `${base}:${resourceType}:${metricName}:${startDate}:${endDate}:${page}:${pageSize}`
    : null

  const { data, error, loading, reload } = useAsyncData(
    () => {
      if (!base || !loaded) return Promise.resolve([])
      const limit = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE)
      return apiRequest<MonitoringMetric[]>(base, {
        query: {
          resource_type: resourceType || undefined,
          metric_name: metricName || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          limit,
          offset: (page - 1) * limit,
        },
      })
    },
    [listKey],
  )

  useEffect(() => {
    setPage(1)
  }, [resourceType, metricName, startDate, endDate])

  if (!companyId || !connectionId) {
    return (
      <>
        <h1 className="page-title">OCI Monitoring</h1>
        <p className="empty">Select a company and connection from the top bar.</p>
      </>
    )
  }

  const metrics = (data ?? []) as MonitoringMetric[]
  const rows = metrics.map((m) => ({
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

      <Alert type="info">
        Sync monitoring from <Link to="/oci/inventory">Inventory → Compartments</Link>: select
        compartments, then Sync monitoring (all resource types). This page loads stored metrics.
      </Alert>

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
          Resource type
          <select value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
            <option value="">All types</option>
            {MONITORING_RESOURCE_TYPES.map((t) => (
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
          disabled={loading}
          onClick={() => {
            setPage(1)
            setLoaded(true)
          }}
        >
          {loading ? 'Loading…' : 'Load metrics'}
        </button>
        {loaded && (
          <button type="button" className="btn" onClick={() => void reload()}>
            Refresh
          </button>
        )}
      </div>

      <Alert type="error">{error}</Alert>

      {!loaded ? (
        <p className="empty">Click Load metrics to fetch stored monitoring data.</p>
      ) : loading ? (
        <p className="loading">Loading…</p>
      ) : (
        <>
          <DataTable rows={rows as Record<string, unknown>[]} paginate={false} />
          <PaginationControls
            page={page}
            pageSize={pageSize}
            itemCount={metrics.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(Math.min(size, MAX_PAGE_SIZE))
              setPage(1)
            }}
          />
        </>
      )}
    </>
  )
}
