import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { loadResourceDisplayNames, resourceDisplayLabel } from '@/oci/resourceDisplayNames'
import TimeSeriesChart from '@/components/TimeSeriesChart'
import BarChart from '@/components/BarChart'
import { Alert } from '@/components/Alert'

type Dimension = 'service' | 'compartment' | 'resources'

interface DailyCostItem {
  date: string
  total_cost: number
}

interface UsageByDateResponse {
  start_date: string
  end_date: string
  currency: string | null
  items: DailyCostItem[]
}

interface UsageTotalResponse {
  total_cost: number
  currency: string | null
}

interface UsageByServiceResponse {
  currency: string | null
  items: { service: string | null; total_cost: number }[]
}

interface UsageByCompartmentResponse {
  currency: string | null
  items: {
    compartment_id: string | null
    compartment_name: string | null
    total_cost: number
  }[]
}

interface TopResourcesResponse {
  currency: string | null
  items: { resource_id?: string; service?: string; total_cost?: number }[]
}

type TrendFilter =
  | { kind: 'service'; value: string }
  | { kind: 'compartment'; value: string; label: string }
  | null

function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
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

export default function CostExplorerPage() {
  const { activeCompany, connection } = useAuth()
  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id
  const defaults = defaultDateRange()

  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [dimension, setDimension] = useState<Dimension>('service')
  const [trendFilter, setTrendFilter] = useState<TrendFilter>(null)

  const base =
    companyId && connectionId
      ? `/api/v1/cloud/oci/usage/${companyId}/connections/${connectionId}/usage`
      : null

  const rangeKey = base ? `${startDate}:${endDate}` : null
  const breakdownKey = rangeKey ? `${base}/breakdown:${rangeKey}` : null
  const trendKey = rangeKey
    ? `${base}/by-date:${rangeKey}:${trendFilter?.kind ?? 'all'}:${trendFilter?.value ?? ''}`
    : null

  const {
    data: breakdown,
    error: breakdownError,
    loading: breakdownLoading,
  } = useAsyncData(
    async () => {
      if (!base || !companyId || !connectionId) return null
      const query = { start_date: startDate, end_date: endDate }
      const [total, byService, byCompartment, topResources, names] = await Promise.all([
        apiRequest<UsageTotalResponse>(`${base}/summary/total`, { query }),
        apiRequest<UsageByServiceResponse>(`${base}/summary/by-service`, { query }),
        apiRequest<UsageByCompartmentResponse>(`${base}/summary/by-compartment`, {
          query: { ...query, limit: 50 },
        }),
        apiRequest<TopResourcesResponse>(`${base}/summary/top-resources`, {
          query: { ...query, limit: 15 },
        }),
        loadResourceDisplayNames(companyId, connectionId),
      ])
      return { total, byService, byCompartment, topResources, names }
    },
    [breakdownKey],
    { keepPreviousData: true },
  )

  const {
    data: trend,
    error: trendError,
    loading: trendLoading,
  } = useAsyncData(
    async () => {
      if (!base) return null
      const query: Record<string, string> = {
        start_date: startDate,
        end_date: endDate,
      }
      if (trendFilter?.kind === 'service') query.service = trendFilter.value
      if (trendFilter?.kind === 'compartment') query.compartment_id = trendFilter.value
      return apiRequest<UsageByDateResponse>(`${base}/summary/by-date`, { query })
    },
    [trendKey],
    { keepPreviousData: true },
  )

  const currency =
    trend?.currency ??
    breakdown?.total.currency ??
    breakdown?.byService.currency ??
    'USD'

  const chartPoints = useMemo(
    () =>
      (trend?.items ?? []).map((item) => ({
        t: item.date,
        value: item.total_cost,
      })),
    [trend],
  )

  const serviceChart = useMemo(
    () =>
      (breakdown?.byService.items ?? []).map((i) => ({
        label: i.service ?? 'unknown',
        value: i.total_cost ?? 0,
        id: i.service ?? 'unknown',
      })),
    [breakdown],
  )

  const compartmentChart = useMemo(
    () =>
      (breakdown?.byCompartment.items ?? []).map((i) => {
        const name = i.compartment_name?.trim()
        const id = i.compartment_id
        const shortId = id && id.length > 18 ? `${id.slice(0, 18)}…` : id
        return {
          label: name || shortId || 'unknown',
          value: i.total_cost ?? 0,
          id: id ?? undefined,
          title: id ?? name ?? undefined,
        }
      }),
    [breakdown],
  )

  const resourceChart = useMemo(() => {
    const names = breakdown?.names ?? {}
    return (breakdown?.topResources.items ?? []).map((i) => ({
      label: i.resource_id
        ? resourceDisplayLabel(i.resource_id, names, i.service ?? 'unknown')
        : (i.service ?? 'unknown'),
      value: i.total_cost ?? 0,
      title: i.resource_id ?? i.service ?? undefined,
    }))
  }, [breakdown])

  const filterLabel =
    trendFilter?.kind === 'service'
      ? `Service: ${trendFilter.value}`
      : trendFilter?.kind === 'compartment'
        ? `Compartment: ${trendFilter.label}`
        : null

  if (!companyId || !connectionId) {
    return (
      <div className="page">
        <h1 className="page-title">Cost Explorer</h1>
        <p className="empty">
          Select a company and OCI connection in the top bar.
          {companyId && !connectionId ? (
            <>
              {' '}
              <Link to="/oci/connections">Set up a connection</Link>
            </>
          ) : null}
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="dashboard-header">
        <h1 className="page-title">Cost Explorer</h1>
        <p className="page-lead">
          Explore daily spend by service, compartment, or top resources. Click a bar to filter the
          trend.
        </p>
      </header>

      <div className="filters">
        <label>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>

      <Alert type="error">{breakdownError || trendError}</Alert>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Total cost</div>
          <div className="value">
            {breakdownLoading && !breakdown
              ? '…'
              : formatMoney(breakdown?.total.total_cost, currency)}
          </div>
        </div>
      </div>

      <section className="card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 8,
          }}
        >
          <h2 style={{ margin: 0 }}>Daily trend</h2>
          {filterLabel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="page-lead" style={{ margin: 0, fontSize: 13 }}>
                Filtered · {filterLabel}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setTrendFilter(null)}
              >
                Clear filter
              </button>
            </div>
          ) : null}
        </div>
        {trendLoading && !trend ? (
          <p className="loading">Loading trend…</p>
        ) : (
          <>
            {trendLoading && trend != null ? (
              <p className="dashboard-cost-updating" aria-live="polite">
                Updating…
              </p>
            ) : null}
            <TimeSeriesChart
              points={chartPoints}
              valueLabel="Cost"
              valuePrefix="$"
              dateOnly
              height={280}
            />
          </>
        )}
      </section>

      <div className="tabs" role="tablist" aria-label="Cost dimension">
        {(
          [
            ['service', 'Service'],
            ['compartment', 'Compartment'],
            ['resources', 'Top resources'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={dimension === value}
            className={`tab${dimension === value ? ' active' : ''}`}
            onClick={() => setDimension(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="card">
        {breakdownLoading && !breakdown ? (
          <p className="loading">Loading breakdown…</p>
        ) : dimension === 'service' ? (
          <>
            <h2>By service</h2>
            <p className="page-lead" style={{ marginTop: 0 }}>
              Click a service to filter the daily trend.
            </p>
            <BarChart
              items={serviceChart}
              formatValue={(v) => formatMoney(v, currency)}
              onItemClick={(item) => {
                if (!item.id) return
                setTrendFilter({ kind: 'service', value: item.id })
              }}
            />
          </>
        ) : dimension === 'compartment' ? (
          <>
            <h2>By compartment</h2>
            <p className="page-lead" style={{ marginTop: 0 }}>
              Click a compartment to filter the daily trend.
            </p>
            <BarChart
              items={compartmentChart}
              formatValue={(v) => formatMoney(v, currency)}
              onItemClick={(item) => {
                if (!item.id) return
                setTrendFilter({
                  kind: 'compartment',
                  value: item.id,
                  label: item.label,
                })
              }}
            />
          </>
        ) : (
          <>
            <h2>Top resources</h2>
            <BarChart items={resourceChart} formatValue={(v) => formatMoney(v, currency)} />
          </>
        )}
      </section>
    </div>
  )
}
