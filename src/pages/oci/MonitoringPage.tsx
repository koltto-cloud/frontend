import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, apiRequestPaged } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useOciCompartments } from '@/hooks/useOciCompartments'
import {
  MONITORING_METRICS_BY_TYPE,
  MONITORING_RESOURCE_TYPES,
  type MonitoringResourceType,
} from '@/oci/monitoring'
import { loadResourceDisplayNames, resourceDisplayLabel } from '@/oci/resourceDisplayNames'
import PageHeader from '@/components/PageHeader'
import { monitoringHelp } from '@/content/pageHelp'
import {
  average,
  classifyUtilization,
  combineUtilizationStatuses,
  DEFAULT_UTILIZATION_THRESHOLDS,
  percentile,
  UTILIZATION_STATUS_LABEL,
  type UtilizationStatus,
} from '@/oci/utilization'
import { Alert } from '@/components/Alert'
import PaginationControls, {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'
import TimeSeriesChart from '@/components/TimeSeriesChart'

const CHART_LIMIT = 2000

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

interface ComputeInstance {
  resource_ocid?: string | null
  display_name?: string | null
  compartment_id?: string | null
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
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function metricValues(rows: MonitoringMetric[]): number[] {
  return rows
    .map((r) => r.mean_value)
    .filter((v): v is number => v != null && !Number.isNaN(Number(v)))
    .map(Number)
}

function statusClass(status: UtilizationStatus): string {
  if (status === 'underutilized') return 'util-badge util-badge-under'
  if (status === 'overutilized') return 'util-badge util-badge-over'
  return 'util-badge util-badge-ok'
}

export default function MonitoringPage() {
  const { activeCompany, connection } = useAuth()
  const defaults = defaultDateRange()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [compartmentId, setCompartmentId] = useState('')
  const [resourceType, setResourceType] = useState<MonitoringResourceType | ''>('compute')
  const [resourceId, setResourceId] = useState('')
  const [metricName, setMetricName] = useState('cpu_utilization')
  const [loaded, setLoaded] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [viewRow, setViewRow] = useState<MonitoringMetric | null>(null)
  const [resourceNames, setResourceNames] = useState<Record<string, string>>({})

  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id

  const { compartments } = useOciCompartments(companyId, connectionId)

  const base =
    companyId && connectionId
      ? `/api/v1/cloud/oci/monitoring/${companyId}/connections/${connectionId}/monitoring`
      : null

  const computeBase =
    companyId && connectionId
      ? `/api/v1/cloud/oci/compute/${companyId}/connections/${connectionId}/compute`
      : null

  const metricOptions =
    resourceType && resourceType in MONITORING_METRICS_BY_TYPE
      ? MONITORING_METRICS_BY_TYPE[resourceType]
      : []

  const listKey = loaded
    ? `${base}:${compartmentId}:${resourceType}:${resourceId}:${metricName}:${startDate}:${endDate}:${page}:${pageSize}`
    : null

  const { data, error, loading, reload } = useAsyncData(
    () => {
      if (!base || !loaded) {
        return Promise.resolve({ items: [] as MonitoringMetric[], total: 0 })
      }
      const limit = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE)
      return apiRequestPaged<MonitoringMetric[]>(base, {
        query: {
          compartment_id: compartmentId || undefined,
          resource_type: resourceType || undefined,
          resource_id: resourceId || undefined,
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

  const metrics = data?.items ?? []
  const totalItems = data?.total ?? undefined

  const chartKey =
    loaded && base && resourceId && metricName
      ? `chart:${base}:${compartmentId}:${resourceType}:${resourceId}:${metricName}:${startDate}:${endDate}`
      : null

  const {
    data: chartRows,
    error: chartError,
    loading: chartLoading,
  } = useAsyncData(
    () => {
      if (!base || !resourceId || !metricName) return Promise.resolve([])
      return apiRequest<MonitoringMetric[]>(base, {
        query: {
          compartment_id: compartmentId || undefined,
          resource_type: resourceType || undefined,
          resource_id: resourceId,
          metric_name: metricName,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          limit: CHART_LIMIT,
          offset: 0,
        },
      })
    },
    [chartKey],
  )

  const utilKey =
    loaded && base && resourceId && resourceType === 'compute'
      ? `util:${base}:${compartmentId}:${resourceId}:${startDate}:${endDate}`
      : null

  const {
    data: utilBundle,
    error: utilError,
    loading: utilLoading,
  } = useAsyncData(
    async () => {
      if (!base || !resourceId) return { cpu: [] as MonitoringMetric[], memory: [] as MonitoringMetric[] }
      const common = {
        compartment_id: compartmentId || undefined,
        resource_type: 'compute',
        resource_id: resourceId,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        limit: CHART_LIMIT,
        offset: 0,
      }
      const [cpu, memory] = await Promise.all([
        apiRequest<MonitoringMetric[]>(base, {
          query: { ...common, metric_name: 'cpu_utilization' },
        }),
        apiRequest<MonitoringMetric[]>(base, {
          query: { ...common, metric_name: 'memory_utilization' },
        }),
      ])
      return { cpu, memory }
    },
    [utilKey],
  )

  const instancesKey =
    companyId && connectionId && resourceType === 'compute' ? `${computeBase}:${compartmentId}` : null

  const { data: instances } = useAsyncData(
    () => {
      if (!computeBase || resourceType !== 'compute') return Promise.resolve([])
      return apiRequest<ComputeInstance[]>(computeBase, {
        query: {
          compartment_id: compartmentId || undefined,
          limit: 500,
          offset: 0,
        },
      })
    },
    [instancesKey],
  )

  useEffect(() => {
    if (!loaded || !companyId || !connectionId) return
    let cancelled = false
    void loadResourceDisplayNames(companyId, connectionId).then((names) => {
      if (!cancelled) setResourceNames(names)
    })
    return () => {
      cancelled = true
    }
  }, [loaded, companyId, connectionId])

  function resetPage() {
    setPage(1)
  }

  function onCompartmentChange(value: string) {
    setCompartmentId(value)
    setResourceId('')
    resetPage()
  }

  function onResourceTypeChange(value: MonitoringResourceType | '') {
    setResourceType(value)
    setResourceId('')
    if (!value) {
      setMetricName('')
    } else {
      const options = MONITORING_METRICS_BY_TYPE[value]
      setMetricName(options[0]?.value ?? '')
    }
    resetPage()
  }

  function onResourceChange(value: string) {
    setResourceId(value)
    resetPage()
  }

  function onMetricChange(value: string) {
    setMetricName(value)
    resetPage()
  }

  function onStartDateChange(value: string) {
    setStartDate(value)
    resetPage()
  }

  function onEndDateChange(value: string) {
    setEndDate(value)
    resetPage()
  }

  const chartPoints = useMemo(() => {
    const rows = [...(chartRows ?? [])].sort(
      (a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime(),
    )
    return rows.map((r) => ({
      t: r.metric_date,
      value: r.mean_value == null ? null : Number(r.mean_value),
    }))
  }, [chartRows])

  const chartStats = useMemo(() => {
    const values = metricValues(chartRows ?? [])
    return {
      mean: average(values),
      p95: percentile(values, 95),
      count: values.length,
    }
  }, [chartRows])

  const utilization = useMemo(() => {
    if (resourceType !== 'compute' || !resourceId) return null
    const cpuVals = metricValues(utilBundle?.cpu ?? [])
    const memVals = metricValues(utilBundle?.memory ?? [])
    const cpuMean = average(cpuVals)
    const memMean = average(memVals)
    const cpuStatus = classifyUtilization(cpuMean)
    const memStatus = classifyUtilization(memMean)
    const overall = combineUtilizationStatuses([cpuStatus, memStatus])
    return {
      cpuMean,
      memMean,
      cpuP95: percentile(cpuVals, 95),
      memP95: percentile(memVals, 95),
      cpuStatus,
      memStatus,
      overall,
    }
  }, [resourceType, resourceId, utilBundle])

  if (!companyId || !connectionId) {
    return (
      <>
        <PageHeader title="Monitoring" helpTitle="About Monitoring" help={monitoringHelp} />
        <p className="empty">Select a company and connection from the top bar.</p>
      </>
    )
  }

  const viewData = viewRow
    ? {
        ...viewRow,
        resource_name: resourceNames[viewRow.resource_id] ?? null,
      }
    : null

  const isPercentMetric =
    metricName === 'cpu_utilization' || metricName === 'memory_utilization'

  const instanceOptions = instances ?? []

  return (
    <>
      <PageHeader
        title="Monitoring"
        lead="Utilization and performance metrics for resources in the selected connection."
        helpTitle="About Monitoring"
        help={monitoringHelp}
      />

      <Alert type="info">
        Sync monitoring from <Link to="/oci/inventory">Inventory → Compartments</Link>: select
        compartments, then Sync monitoring. Compute charts use default thresholds ({'<'}
        {DEFAULT_UTILIZATION_THRESHOLDS.under}% under / {'>'}
        {DEFAULT_UTILIZATION_THRESHOLDS.over}% over) on period mean — custom thresholds later.
      </Alert>

      <div className="filters">
        <label>
          Start date
          <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
        </label>
        <label>
          End date
          <input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
        </label>
        <label>
          Compartment
          <select value={compartmentId} onChange={(e) => onCompartmentChange(e.target.value)}>
            <option value="">All compartments</option>
            {compartments.map((c) => (
              <option key={c.compartment_ocid} value={c.compartment_ocid}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Resource type
          <select
            value={resourceType}
            onChange={(e) => onResourceTypeChange(e.target.value as MonitoringResourceType | '')}
          >
            <option value="">All types</option>
            {MONITORING_RESOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {resourceType === 'compute' && (
          <label>
            Resource
            <select value={resourceId} onChange={(e) => onResourceChange(e.target.value)}>
              <option value="">All resources</option>
              {instanceOptions.map((inst) => {
                const id = inst.resource_ocid ?? ''
                if (!id) return null
                const label = inst.display_name || resourceDisplayLabel(id, resourceNames)
                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                )
              })}
            </select>
          </label>
        )}
        <label>
          Metric
          <select value={metricName} onChange={(e) => onMetricChange(e.target.value)}>
            {!resourceType && <option value="">All metrics</option>}
            {metricOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
            {resourceType && metricOptions.length === 0 && <option value="">—</option>}
          </select>
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

      <Alert type="error">{error || chartError || utilError}</Alert>

      {!loaded ? (
        <p className="empty">
          Pick a date range (and preferably a compute resource), then Load metrics.
        </p>
      ) : (
        <>
          {resourceId && metricName && (
            <div className="card monitoring-chart-card">
              <div className="monitoring-chart-header">
                <h2>
                  {resourceDisplayLabel(resourceId, resourceNames)} ·{' '}
                  {metricOptions.find((m) => m.value === metricName)?.label ?? metricName}
                </h2>
                {utilization?.overall && (
                  <span className={statusClass(utilization.overall)} title="Based on period mean CPU/memory">
                    {UTILIZATION_STATUS_LABEL[utilization.overall]}
                  </span>
                )}
              </div>

              {resourceType === 'compute' && (
                <div className="monitoring-util-row">
                  {utilLoading ? (
                    <p className="loading">Evaluating utilization…</p>
                  ) : (
                    <>
                      <div className="monitoring-stat">
                        <span className="monitoring-stat-label">CPU mean</span>
                        <span>{formatNumber(utilization?.cpuMean)}%</span>
                        {utilization?.cpuStatus && (
                          <span className={statusClass(utilization.cpuStatus)}>
                            {UTILIZATION_STATUS_LABEL[utilization.cpuStatus]}
                          </span>
                        )}
                      </div>
                      <div className="monitoring-stat">
                        <span className="monitoring-stat-label">CPU p95</span>
                        <span>{formatNumber(utilization?.cpuP95)}%</span>
                      </div>
                      <div className="monitoring-stat">
                        <span className="monitoring-stat-label">Memory mean</span>
                        <span>{formatNumber(utilization?.memMean)}%</span>
                        {utilization?.memStatus && (
                          <span className={statusClass(utilization.memStatus)}>
                            {UTILIZATION_STATUS_LABEL[utilization.memStatus]}
                          </span>
                        )}
                      </div>
                      <div className="monitoring-stat">
                        <span className="monitoring-stat-label">Memory p95</span>
                        <span>{formatNumber(utilization?.memP95)}%</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="monitoring-util-row monitoring-chart-stats">
                <div className="monitoring-stat">
                  <span className="monitoring-stat-label">Series mean</span>
                  <span>
                    {formatNumber(chartStats.mean)}
                    {isPercentMetric ? '%' : ''}
                  </span>
                </div>
                <div className="monitoring-stat">
                  <span className="monitoring-stat-label">Series p95</span>
                  <span>
                    {formatNumber(chartStats.p95)}
                    {isPercentMetric ? '%' : ''}
                  </span>
                </div>
                <div className="monitoring-stat">
                  <span className="monitoring-stat-label">Points</span>
                  <span>{chartStats.count}</span>
                </div>
              </div>

              {chartLoading ? (
                <p className="loading">Loading chart…</p>
              ) : (
                <TimeSeriesChart
                  points={chartPoints}
                  valueLabel={metricOptions.find((m) => m.value === metricName)?.label ?? metricName}
                  valueSuffix={isPercentMetric ? '%' : ''}
                />
              )}
            </div>
          )}

          {loaded && !resourceId && resourceType === 'compute' && (
            <p className="empty">
              Select a compute resource to see the utilization chart and rightsizing badge.
            </p>
          )}

          {loading ? (
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
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(Math.min(size, MAX_PAGE_SIZE))
                  setPage(1)
                }}
              />
            </>
          )}
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
