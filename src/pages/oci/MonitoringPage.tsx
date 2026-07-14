import { useEffect, useState } from 'react'
import { apiRequest } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { MONITORING_RESOURCE_TYPES } from '@/oci/monitoring'
import { loadResourceDisplayNames, resourceDisplayLabel } from '@/oci/resourceDisplayNames'
import { Alert } from '@/components/Alert'
import PaginationControls, {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'
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

const RESOURCE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  MONITORING_RESOURCE_TYPES.map((t) => [t.value, t.label]),
)

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })
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
  const [viewRow, setViewRow] = useState<MonitoringMetric | null>(null)
  const [resourceNames, setResourceNames] = useState<Record<string, string>>({})

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

  useEffect(() => {
    if (!loaded || !companyId || !connectionId) {
      setResourceNames({})
      return
    }
    let cancelled = false
    void loadResourceDisplayNames(companyId, connectionId).then((names) => {
      if (!cancelled) setResourceNames(names)
    })
    return () => {
      cancelled = true
    }
  }, [loaded, companyId, connectionId])

  if (!companyId || !connectionId) {
    return (
      <>
        <h1 className="page-title">OCI Monitoring</h1>
        <p className="empty">Select a company and connection from the top bar.</p>
      </>
    )
  }

  const metrics = data ?? []
  const viewData = viewRow
    ? {
        ...viewRow,
        resource_name: resourceNames[viewRow.resource_id] ?? null,
      }
    : null

  return (
    <>
      <h1 className="page-title">OCI Monitoring</h1>

      <Alert type="info">
        Sync monitoring from <Link to="/oci/inventory">Inventory → Compartments</Link>: select
        compartments, then Sync monitoring (all resource types).
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
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Resource type</th>
                  <th>Metric</th>
                  <th>Resource</th>
                  <th>Mean</th>
                  <th>Max</th>
                  <th>Min</th>
                  <th>Synced</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((row) => {
                  const name = resourceDisplayLabel(row.resource_id, resourceNames)
                  return (
                    <tr key={`${row.id}-${row.metric_date}`}>
                      <td>{formatDate(row.metric_date)}</td>
                      <td>{RESOURCE_TYPE_LABELS[row.resource_type] ?? row.resource_type}</td>
                      <td>{row.metric_name || '—'}</td>
                      <td className="col-resource">
                        <button
                          type="button"
                          className="id-link"
                          title={row.resource_id}
                          onClick={() => setViewRow(row)}
                        >
                          {name}
                        </button>
                      </td>
                      <td>{formatNumber(row.mean_value)}</td>
                      <td>{formatNumber(row.max_value)}</td>
                      <td>{formatNumber(row.min_value)}</td>
                      <td>{formatDate(row.synced_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {metrics.length === 0 && <p className="empty">No monitoring metrics found.</p>}
          </div>
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

      {viewData && (
        <Modal title="Monitoring metric details" onClose={() => setViewRow(null)} wide>
          <JsonViewer data={viewData} />
        </Modal>
      )}
    </>
  )
}
