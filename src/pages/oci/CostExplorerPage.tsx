import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { loadResourceDisplayNames, resourceDisplayLabel } from '@/oci/resourceDisplayNames'
import TimeSeriesChart from '@/components/TimeSeriesChart'
import BarChart from '@/components/BarChart'
import ResourceCostUtilPanel from '@/components/ResourceCostUtilPanel'
import { Alert } from '@/components/Alert'
import PageHeader from '@/components/PageHeader'
import { costExplorerHelp } from '@/content/pageHelp'

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
  const [selectedResource, setSelectedResource] = useState<{
    resourceId: string
    label: string
    service?: string | null
    periodCost?: number | null
  } | null>(null)

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
      id: i.resource_id ?? undefined,
      service: i.service,
    }))
  }, [breakdown])

  const filterLabel =
    trendFilter?.kind === 'service'
      ? `Service: ${trendFilter.value}`
      : trendFilter?.kind === 'compartment'
        ? `Scope: ${trendFilter.label}`
        : null

  if (!companyId || !connectionId) {
    return (
      <div className="page">
        <PageHeader
          title="Cost Explorer"
          helpTitle="About Cost Explorer"
          help={costExplorerHelp}
        />
        <p className="empty">
          Select a company and cloud connection in the top bar.
          {companyId && !connectionId ? (
            <>
              {' '}
              <Link to="/connections">Set up a connection</Link>
            </>
          ) : null}
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Cost Explorer"
          lead="Explore daily spend by service, scope, or top resources. Click a service/scope to filter the trend, or a top resource for cost + utilization."
        helpTitle="About Cost Explorer"
        help={costExplorerHelp}
      />

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
            ['compartment', 'Scope'],
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
            <h2>By scope</h2>
            <p className="page-lead" style={{ marginTop: 0 }}>
              Click a scope to filter the daily trend. On OCI this is a compartment; on AWS an
              account; on Azure a subscription or resource group.
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
            <p className="page-lead" style={{ marginTop: 0 }}>
              Click a resource to open cost + utilization (compute shows capacity and 20%/80%
              guides).
            </p>
            <BarChart
              items={resourceChart}
              formatValue={(v) => formatMoney(v, currency)}
              onItemClick={(item) => {
                if (!item.id) return
                setSelectedResource({
                  resourceId: item.id,
                  label: item.label,
                  service: item.service,
                  periodCost: item.value,
                })
                setDimension('resources')
              }}
            />
          </>
        )}
      </section>

      {selectedResource ? (
        <ResourceCostUtilPanel
          companyId={companyId}
          connectionId={connectionId}
          resourceId={selectedResource.resourceId}
          resourceName={selectedResource.label}
          service={selectedResource.service}
          startDate={startDate}
          endDate={endDate}
          currency={currency}
          periodCost={selectedResource.periodCost}
          onClose={() => setSelectedResource(null)}
        />
      ) : null}
    </div>
  )
}
