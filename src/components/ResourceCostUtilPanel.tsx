import { useMemo } from 'react'
import { apiRequest } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import TimeSeriesChart from '@/components/TimeSeriesChart'
import {
  formatComputeCapacity,
  isComputeOcid,
  loadInventoryOptions,
  type InventoryOption,
} from '@/oci/inventoryOptions'
import { resourceDisplayLabel } from '@/oci/resourceDisplayNames'
import {
  average,
  classifyUtilization,
  combineUtilizationStatuses,
  DEFAULT_UTILIZATION_THRESHOLDS,
  percentile,
  UTILIZATION_STATUS_LABEL,
  type UtilizationStatus,
} from '@/oci/utilization'

interface DailyCostItem {
  date: string
  total_cost: number
}

interface UsageByDateResponse {
  currency: string | null
  items: DailyCostItem[]
}

interface MonitoringMetric {
  metric_date: string
  mean_value: number | null
}

interface ResourceCostUtilPanelProps {
  companyId: string
  connectionId: string
  resourceId: string
  resourceName?: string
  service?: string | null
  startDate: string
  endDate: string
  currency: string | null
  periodCost?: number | null
  onClose: () => void
}

function formatMoney(amount: number | null | undefined, currency: string | null): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  const raw = (currency && currency.trim() ? currency.trim() : 'USD').toUpperCase()
  const code = raw === 'US$' || raw === 'USA' ? 'USD' : raw
  try {
    return Number(amount).toLocaleString(undefined, {
      style: 'currency',
      currency: code.length === 3 ? code : 'USD',
      maximumFractionDigits: 2,
    })
  } catch {
    return `$${Number(amount).toFixed(2)}`
  }
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function statusClass(status: UtilizationStatus): string {
  if (status === 'underutilized') return 'util-badge util-badge-under'
  if (status === 'overutilized') return 'util-badge util-badge-over'
  return 'util-badge util-badge-ok'
}

function metricValues(rows: MonitoringMetric[]): number[] {
  return rows
    .map((r) => r.mean_value)
    .filter((v): v is number => v != null && !Number.isNaN(Number(v)))
    .map(Number)
}

export default function ResourceCostUtilPanel({
  companyId,
  connectionId,
  resourceId,
  resourceName,
  service,
  startDate,
  endDate,
  currency,
  periodCost,
  onClose,
}: ResourceCostUtilPanelProps) {
  const isCompute = isComputeOcid(resourceId)
  const usageBase = `/api/v1/cloud/oci/usage/${companyId}/connections/${connectionId}/usage`
  const monitoringBase = `/api/v1/cloud/oci/monitoring/${companyId}/connections/${connectionId}/monitoring`

  const costKey = `${usageBase}:${resourceId}:${startDate}:${endDate}`
  const {
    data: costSeries,
    error: costError,
    loading: costLoading,
  } = useAsyncData(
    () =>
      apiRequest<UsageByDateResponse>(`${usageBase}/summary/by-date`, {
        query: {
          start_date: startDate,
          end_date: endDate,
          resource_id: resourceId,
        },
      }),
    [costKey],
  )

  const invKey = isCompute ? `inv-compute:${companyId}:${connectionId}:${resourceId}` : null
  const { data: computeRow } = useAsyncData(
    async () => {
      if (!isCompute) return null as InventoryOption | null
      const rows = await loadInventoryOptions('compute', companyId, connectionId)
      return rows.find((r) => r.resource_ocid === resourceId) ?? null
    },
    [invKey],
  )

  const utilKey = isCompute
    ? `util:${monitoringBase}:${resourceId}:${startDate}:${endDate}`
    : null
  const {
    data: utilBundle,
    error: utilError,
    loading: utilLoading,
  } = useAsyncData(
    async () => {
      if (!isCompute) return { cpu: [] as MonitoringMetric[], memory: [] as MonitoringMetric[] }
      const common = {
        resource_type: 'compute',
        resource_id: resourceId,
        start_date: startDate,
        end_date: endDate,
        limit: 2000,
        offset: 0,
      }
      const [cpu, memory] = await Promise.all([
        apiRequest<MonitoringMetric[]>(monitoringBase, {
          query: { ...common, metric_name: 'cpu_utilization' },
        }).catch(() => []),
        apiRequest<MonitoringMetric[]>(monitoringBase, {
          query: { ...common, metric_name: 'memory_utilization' },
        }).catch(() => []),
      ])
      return { cpu, memory }
    },
    [utilKey],
  )

  const costPoints = useMemo(
    () =>
      (costSeries?.items ?? []).map((item) => ({
        t: item.date,
        value: item.total_cost,
      })),
    [costSeries],
  )

  const utilPoints = useMemo(() => {
    const byDay = new Map<string, { t: string; cpu: number | null; mem: number | null }>()
    for (const r of utilBundle?.cpu ?? []) {
      const day = r.metric_date.slice(0, 10)
      const cur = byDay.get(day) ?? { t: day, cpu: null, mem: null }
      cur.cpu = r.mean_value == null ? null : Number(r.mean_value)
      byDay.set(day, cur)
    }
    for (const r of utilBundle?.memory ?? []) {
      const day = r.metric_date.slice(0, 10)
      const cur = byDay.get(day) ?? { t: day, cpu: null, mem: null }
      cur.mem = r.mean_value == null ? null : Number(r.mean_value)
      byDay.set(day, cur)
    }
    return [...byDay.values()].sort((a, b) => a.t.localeCompare(b.t))
  }, [utilBundle])

  const utilization = useMemo(() => {
    if (!isCompute) return null
    const cpuVals = metricValues(utilBundle?.cpu ?? [])
    const memVals = metricValues(utilBundle?.memory ?? [])
    const cpuMean = average(cpuVals)
    const memMean = average(memVals)
    const cpuStatus = classifyUtilization(cpuMean)
    const memStatus = classifyUtilization(memMean)
    return {
      cpuMean,
      memMean,
      cpuP95: percentile(cpuVals, 95),
      memP95: percentile(memVals, 95),
      cpuStatus,
      memStatus,
      overall: combineUtilizationStatuses([cpuStatus, memStatus]),
    }
  }, [isCompute, utilBundle])

  const capacityLabel = formatComputeCapacity(computeRow)
  const title = resourceName || resourceDisplayLabel(resourceId, {})
  const seriesCurrency = costSeries?.currency ?? currency
  const computedPeriodCost =
    periodCost ??
    (costSeries?.items ?? []).reduce((sum, i) => sum + (i.total_cost ?? 0), 0)

  return (
    <section className="card resource-cost-util-panel">
      <div className="monitoring-chart-header">
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <p className="page-lead" style={{ margin: '0.35rem 0 0' }}>
            {service ? `${service} · ` : ''}
            Period cost: {formatMoney(computedPeriodCost, seriesCurrency)}
            {capacityLabel ? (
              <>
                {' '}
                · Provisioned: <strong>{capacityLabel}</strong> (100% = full capacity)
              </>
            ) : null}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {utilization?.overall ? (
            <span className={statusClass(utilization.overall)}>
              {UTILIZATION_STATUS_LABEL[utilization.overall]}
            </span>
          ) : null}
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {(costError || utilError) && (
        <p className="empty" style={{ color: 'var(--danger)' }}>
          {costError || utilError}
        </p>
      )}

      <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
        Daily cost
      </h3>
      {costLoading && !costSeries ? (
        <p className="loading">Loading cost…</p>
      ) : (
        <TimeSeriesChart
          points={costPoints}
          valueLabel="Cost"
          valuePrefix="$"
          dateOnly
          height={220}
        />
      )}

      {isCompute ? (
        <>
          <h3 style={{ marginTop: '1.25rem', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Utilization vs capacity
          </h3>
          <div className="monitoring-util-row">
            {utilLoading ? (
              <p className="loading">Loading utilization…</p>
            ) : (
              <>
                <div className="monitoring-stat">
                  <span className="monitoring-stat-label">CPU mean</span>
                  <span>{formatNumber(utilization?.cpuMean)}%</span>
                  {utilization?.cpuStatus ? (
                    <span className={statusClass(utilization.cpuStatus)}>
                      {UTILIZATION_STATUS_LABEL[utilization.cpuStatus]}
                    </span>
                  ) : null}
                </div>
                <div className="monitoring-stat">
                  <span className="monitoring-stat-label">CPU p95</span>
                  <span>{formatNumber(utilization?.cpuP95)}%</span>
                </div>
                <div className="monitoring-stat">
                  <span className="monitoring-stat-label">Memory mean</span>
                  <span>{formatNumber(utilization?.memMean)}%</span>
                  {utilization?.memStatus ? (
                    <span className={statusClass(utilization.memStatus)}>
                      {UTILIZATION_STATUS_LABEL[utilization.memStatus]}
                    </span>
                  ) : null}
                </div>
                <div className="monitoring-stat">
                  <span className="monitoring-stat-label">Memory p95</span>
                  <span>{formatNumber(utilization?.memP95)}%</span>
                </div>
              </>
            )}
          </div>
          {utilLoading && !utilBundle ? (
            <p className="loading">Loading chart…</p>
          ) : utilPoints.length === 0 ? (
            <p className="empty">
              No CPU/memory monitoring for this instance in range. Sync monitoring from Inventory.
            </p>
          ) : (
            <TimeSeriesChart
              points={utilPoints}
              series={[
                { key: 'cpu', label: 'CPU %', color: 'var(--accent)' },
                { key: 'mem', label: 'Memory %', color: '#c2410c', type: 'line' },
              ]}
              valueSuffix="%"
              dateOnly
              height={240}
              yDomain={[0, 100]}
              referenceLines={[
                {
                  y: DEFAULT_UTILIZATION_THRESHOLDS.under,
                  label: `Under ${DEFAULT_UTILIZATION_THRESHOLDS.under}%`,
                  color: 'rgba(180, 83, 9, 0.7)',
                },
                {
                  y: DEFAULT_UTILIZATION_THRESHOLDS.over,
                  label: `Over ${DEFAULT_UTILIZATION_THRESHOLDS.over}%`,
                  color: 'rgba(225, 29, 72, 0.65)',
                },
              ]}
            />
          )}
        </>
      ) : (
        <p className="page-lead" style={{ marginTop: '1rem' }}>
          Cost trend for this resource is above. CPU/memory capacity overlay is available for
          compute instances — open Monitoring for other resource metrics.
        </p>
      )}
    </section>
  )
}
