import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  notableDayOverDaySpikes,
  periodStatsFromSeries,
  toLocalIsoDate,
} from '@/dashboard/costInsights'
import PageHeader from '@/components/PageHeader'
import { dashboardHelp } from '@/content/pageHelp'
import {
  loadUnderutilizedOpportunities,
  type TopResourceItem,
} from '@/dashboard/opportunities'
import TimeSeriesChart from '@/components/TimeSeriesChart'
import BarChart from '@/components/BarChart'
import { Alert } from '@/components/Alert'

type RangePreset = 'day' | '3m' | '12m' | 'custom'
/** `all` = sum across clouds (OCI only until AWS/GCP exist). */
type CloudFilter = 'all' | 'oci'

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

interface UsageByServiceResponse {
  start_date: string
  end_date: string
  currency: string | null
  items: { service: string | null; total_cost: number }[]
}

interface UsageByCompartmentResponse {
  start_date: string
  end_date: string
  currency: string | null
  items: {
    compartment_id: string | null
    compartment_name: string | null
    total_cost: number
  }[]
}

interface TopResourcesResponse {
  start_date: string
  end_date: string
  currency: string | null
  items: TopResourceItem[]
}

function rangeForPreset(preset: RangePreset): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  if (preset === 'day') {
    // Single calendar day (yesterday) — not yesterday→today (2 days).
    start.setDate(start.getDate() - 1)
    end.setTime(start.getTime())
  } else if (preset === '3m') {
    start.setMonth(start.getMonth() - 3)
  } else if (preset === '12m') {
    start.setMonth(start.getMonth() - 12)
  }
  return { start: toLocalIsoDate(start), end: toLocalIsoDate(end) }
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

function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`
}

function formatUtilPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(1)}%`
}

export default function DashboardPage() {
  const { user, activeCompany, connection } = useAuth()
  const defaults = rangeForPreset('3m')
  const [preset, setPreset] = useState<RangePreset>('3m')
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [cloud, setCloud] = useState<CloudFilter>('all')

  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id

  const firstName = user?.first_name?.trim()
  const greetingName = firstName || user?.email || 'there'
  const hasConnection = Boolean(connectionId)
  const hasCompany = Boolean(companyId)

  const [opportunitiesEnabled, setOpportunitiesEnabled] = useState(false)

  const usageBase =
    companyId && connectionId
      ? `/api/v1/cloud/oci/usage/${companyId}/connections/${connectionId}/usage`
      : null

  // OCI is the only cloud today and `cloud` is not sent to the API, so `all` and
  // `oci` return identical data. Keep it out of the fetch key so toggling the
  // filter doesn't refetch. Add it back here once AWS/GCP change the query.
  const rangeKey = usageBase ? `${startDate}:${endDate}` : null
  const costKey = usageBase && rangeKey ? `${usageBase}/by-date:${rangeKey}` : null
  const breakdownKey = usageBase && rangeKey ? `${usageBase}/breakdown:${rangeKey}` : null
  const compartmentKey =
    usageBase && rangeKey ? `${usageBase}/by-compartment:${rangeKey}` : null
  const opportunitiesKey =
    usageBase && companyId && connectionId && rangeKey && opportunitiesEnabled
      ? `${usageBase}/opportunities:${rangeKey}`
      : null

  const {
    data: costSeries,
    error: costError,
    loading: costLoading,
  } = useAsyncData(
    () => {
      if (!usageBase) return Promise.resolve(null)
      return apiRequest<UsageByDateResponse>(`${usageBase}/summary/by-date`, {
        query: { start_date: startDate, end_date: endDate },
      })
    },
    [costKey],
    { keepPreviousData: true },
  )

  // Paint cost charts first; opportunities need extra monitoring/inventory calls.
  useEffect(() => {
    setOpportunitiesEnabled(false)
  }, [rangeKey])

  useEffect(() => {
    if (!usageBase) {
      setOpportunitiesEnabled(false)
      return
    }
    if (costLoading && costSeries == null) return
    const t = window.setTimeout(() => setOpportunitiesEnabled(true), 50)
    return () => window.clearTimeout(t)
  }, [usageBase, costLoading, costSeries, rangeKey])

  const {
    data: breakdown,
    error: breakdownError,
    loading: breakdownLoading,
  } = useAsyncData(
    async () => {
      if (!usageBase) return null
      return apiRequest<UsageByServiceResponse>(`${usageBase}/summary/by-service`, {
        query: { start_date: startDate, end_date: endDate },
      })
    },
    [breakdownKey],
    { keepPreviousData: true },
  )

  const {
    data: compartmentBreakdown,
    error: compartmentError,
    loading: compartmentLoading,
  } = useAsyncData(
    async () => {
      if (!usageBase) return null
      return apiRequest<UsageByCompartmentResponse>(`${usageBase}/summary/by-compartment`, {
        query: { start_date: startDate, end_date: endDate, limit: 10 },
      })
    },
    [compartmentKey],
    { keepPreviousData: true },
  )

  const {
    data: opportunities,
    error: opportunitiesError,
    loading: opportunitiesLoading,
  } = useAsyncData(
    async () => {
      if (!opportunitiesEnabled || !usageBase || !companyId || !connectionId) return []
      const top = await apiRequest<TopResourcesResponse>(`${usageBase}/summary/top-resources`, {
        query: { start_date: startDate, end_date: endDate, limit: 10 },
      })
      return loadUnderutilizedOpportunities({
        companyId,
        connectionId,
        topResources: top.items ?? [],
      })
    },
    [opportunitiesKey],
    { keepPreviousData: true },
  )

  const currency =
    costSeries?.currency ?? breakdown?.currency ?? compartmentBreakdown?.currency ?? 'USD'

  const chartPoints = useMemo(
    () =>
      (costSeries?.items ?? []).map((item) => ({
        t: item.date,
        value: item.total_cost,
      })),
    [costSeries],
  )

  // Tie stats to the series being shown (incl. keepPreviousData), never to the
  // picker alone — otherwise changing range divides an old total by a new day count.
  const periodStats = useMemo(() => periodStatsFromSeries(costSeries), [costSeries])
  const periodTotal = periodStats?.periodTotal ?? null
  const dailyAverage = periodStats?.dailyAverage ?? null

  const serviceChart = useMemo(() => {
    const items = breakdown?.items ?? []
    return items.slice(0, 10).map((i) => ({
      label: i.service ?? 'unknown',
      value: i.total_cost ?? 0,
    }))
  }, [breakdown])

  const compartmentChart = useMemo(() => {
    const items = compartmentBreakdown?.items ?? []
    return items.slice(0, 10).map((i) => {
      const name = i.compartment_name?.trim()
      const id = i.compartment_id
      const shortId = id && id.length > 18 ? `${id.slice(0, 18)}…` : id
      return {
        label: name || shortId || 'unknown',
        value: i.total_cost ?? 0,
        title: id ?? name ?? undefined,
      }
    })
  }, [compartmentBreakdown])
  const spikes = useMemo(
    () => notableDayOverDaySpikes(costSeries?.items ?? [], 5),
    [costSeries],
  )

  function applyPreset(next: RangePreset) {
    setPreset(next)
    if (next === 'custom') return
    const range = rangeForPreset(next)
    setStartDate(range.start)
    setEndDate(range.end)
  }

  const cloudLabel = cloud === 'all' ? 'All clouds' : 'OCI'
  const opportunityRows = opportunities ?? []

  return (
    <>
      <PageHeader
        title="Dashboard"
        lead={`Hi ${greetingName} — here’s your cloud spend overview.`}
        helpTitle="About the Dashboard"
        help={dashboardHelp}
      />

      {!hasCompany || !hasConnection ? (
        <p className="empty">
          Select a company and connection in the top bar to view daily total cost.
          {!hasConnection && hasCompany && (
            <>
              {' '}
              <Link to="/connections">Set up a connection</Link>
            </>
          )}
        </p>
      ) : (
        <div className="dashboard-stack">
          <section className="card dashboard-cost-card">
            <div className="dashboard-cost-header">
              <div>
                <h2>Total cost</h2>
                <p className="dashboard-cost-subtitle">Daily spend ({cloudLabel})</p>
              </div>
              <label className="dashboard-cloud-filter">
                Cloud
                <select value={cloud} onChange={(e) => setCloud(e.target.value as CloudFilter)}>
                  <option value="all">All clouds</option>
                  <option value="oci">OCI</option>
                </select>
              </label>
            </div>

            <div className="dashboard-cost-stats">
              <div className="dashboard-cost-stat">
                <span className="dashboard-cost-stat-label">Period total</span>
                <span className="dashboard-cost-stat-value">
                  {formatMoney(periodTotal, currency)}
                </span>
              </div>
              <div className="dashboard-cost-stat">
                <span className="dashboard-cost-stat-label">Daily average</span>
                <span className="dashboard-cost-stat-value">
                  {formatMoney(dailyAverage, currency)}
                </span>
                {periodStats != null && periodStats.dayCount > 0 && (
                  <span className="dashboard-cost-stat-hint">
                    over {periodStats.dayCount} day{periodStats.dayCount === 1 ? '' : 's'} with data
                  </span>
                )}
              </div>
            </div>

            <div className="dashboard-cost-presets" role="group" aria-label="Date range">
              {(
                [
                  ['day', 'Last day'],
                  ['3m', '3 months'],
                  ['12m', '12 months'],
                  ['custom', 'Custom'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`btn dashboard-preset-btn${preset === value ? ' is-active' : ''}`}
                  onClick={() => applyPreset(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="filters dashboard-cost-custom">
                <label>
                  Start date
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setPreset('custom')
                      setStartDate(e.target.value)
                    }}
                  />
                </label>
                <label>
                  End date
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setPreset('custom')
                      setEndDate(e.target.value)
                    }}
                  />
                </label>
              </div>
            )}

            <Alert type="error">{costError}</Alert>

            {costLoading && !costSeries ? (
              <p className="loading">Loading cost series…</p>
            ) : (
              <>
                {costLoading && costSeries != null && (
                  <p className="dashboard-cost-updating" aria-live="polite">
                    Updating…
                  </p>
                )}
                <TimeSeriesChart
                  points={chartPoints}
                  valueLabel="Cost"
                  valuePrefix="$"
                  dateOnly
                  height={300}
                />
              </>
            )}
          </section>

          <div className="dashboard-breakdown-grid">
            <section className="card dashboard-cost-card dashboard-panel">
              <div className="dashboard-section-header">
                <h2>By service</h2>
                <p className="dashboard-cost-subtitle">
                  Top 10 services ({cloudLabel})
                </p>
              </div>
              <Alert type="error">{breakdownError}</Alert>
              {breakdownLoading && !breakdown ? (
                <p className="loading">Loading…</p>
              ) : (
                <>
                  {breakdownLoading && breakdown != null && (
                    <p className="dashboard-cost-updating" aria-live="polite">
                      Updating…
                    </p>
                  )}
                  <BarChart
                    variant="dashboard"
                    items={serviceChart}
                    formatValue={(v) => formatMoney(v, currency)}
                  />
                </>
              )}
            </section>

            <section className="card dashboard-cost-card dashboard-panel">
              <div className="dashboard-section-header">
                <h2>By compartment</h2>
                <p className="dashboard-cost-subtitle">
                  Top 10 compartments ({cloudLabel})
                </p>
              </div>
              <Alert type="error">{compartmentError}</Alert>
              {compartmentLoading && !compartmentBreakdown ? (
                <p className="loading">Loading…</p>
              ) : (
                <>
                  {compartmentLoading && compartmentBreakdown != null && (
                    <p className="dashboard-cost-updating" aria-live="polite">
                      Updating…
                    </p>
                  )}
                  <BarChart
                    variant="dashboard"
                    items={compartmentChart}
                    formatValue={(v) => formatMoney(v, currency)}
                  />
                </>
              )}
            </section>
          </div>

          <div className="dashboard-breakdown-grid">
            <section className="card dashboard-cost-card dashboard-panel">
              <div className="dashboard-section-header">
                <h2>Opportunities</h2>
                <p className="dashboard-cost-subtitle">
                  Underutilized compute among top spenders
                </p>
              </div>
              {opportunitiesError ? <Alert type="error">{opportunitiesError}</Alert> : null}
              {!opportunitiesEnabled || (opportunitiesLoading && opportunities == null) ? (
                <p className="loading">Loading opportunities…</p>
              ) : (
                <>
                  {opportunitiesLoading && opportunities != null && (
                    <p className="dashboard-cost-updating" aria-live="polite">
                      Updating…
                    </p>
                  )}
                  {opportunityRows.length === 0 ? (
                    <p className="empty">
                      No underutilized high-cost compute in the top spenders.
                    </p>
                  ) : (
                    <ul className="dashboard-opportunity-list">
                      {opportunityRows.map((row) => (
                        <li key={row.resourceId} className="dashboard-opportunity-row">
                          <div className="dashboard-opportunity-main">
                            <Link
                              to="/oci/monitoring"
                              className="dashboard-opportunity-name"
                              title={row.resourceId}
                            >
                              {row.name}
                            </Link>
                            <span className="util-badge util-badge-under">{row.statusLabel}</span>
                          </div>
                          <div className="dashboard-opportunity-meta">
                            <span>{formatMoney(row.totalCost, currency)}</span>
                            <span>CPU {formatUtilPct(row.cpuMean)}</span>
                            <span>Mem {formatUtilPct(row.memMean)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>

            <section className="card dashboard-cost-card dashboard-panel">
              <div className="dashboard-section-header">
                <h2>Notable changes</h2>
                <p className="dashboard-cost-subtitle">Biggest day-over-day spend increases</p>
              </div>
              {costLoading && !costSeries ? (
                <p className="loading">Loading…</p>
              ) : spikes.length === 0 ? (
                <p className="empty">No notable daily increases in this range.</p>
              ) : (
                <ul className="dashboard-spike-list">
                  {spikes.map((spike) => (
                    <li key={spike.date} className="dashboard-spike-row">
                      <div className="dashboard-spike-main">
                        <span className="dashboard-spike-date">{spike.date}</span>
                        <span className="dashboard-spike-delta">
                          +{formatMoney(spike.delta, currency)}
                        </span>
                      </div>
                      <div className="dashboard-spike-meta">
                        <span>
                          {formatMoney(spike.previousCost, currency)} →{' '}
                          {formatMoney(spike.cost, currency)}
                        </span>
                        <span>{formatPct(spike.pctChange)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  )
}
