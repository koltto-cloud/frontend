import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  periodStatsFromSeries,
  toLocalIsoDate,
} from '@/dashboard/costInsights'
import PageHeader from '@/components/PageHeader'
import { dashboardHelp } from '@/content/pageHelp'
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

interface SpendAnomaly {
  date: string
  total_cost: number
  baseline_avg: number
  delta: number
  pct_change: number
  currency: string | null
  driver_service: string | null
  driver_delta: number
}

interface SpendAnomaliesResponse {
  currency: string | null
  items: SpendAnomaly[]
}

type RecKind =
  | 'idle'
  | 'oversized'
  | 'overutilized'
  | 'idle_storage'
  | 'idle_lb'
  | 'unattached_volume'

interface RecommendationItem {
  resource_id: string | null
  resource_name: string | null
  resource_type: string
  kind: RecKind
  action: string
  monthly_cost: number
  currency: string | null
  estimated_monthly_savings: number
  recommendation: string
  silenced?: boolean
}

interface RecommendationsResponse {
  currency: string | null
  items: RecommendationItem[]
}

const REC_KIND_META: Record<RecKind, { label: string; tone: string }> = {
  idle: { label: 'Stop', tone: 'danger' },
  idle_storage: { label: 'Review', tone: 'warning' },
  idle_lb: { label: 'Terminate', tone: 'danger' },
  unattached_volume: { label: 'Terminate', tone: 'danger' },
  oversized: { label: 'Downsize', tone: 'warning' },
  overutilized: { label: 'Scale up', tone: 'accent' },
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

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toLocalIsoDate(d)
}

function recActionLabel(item: RecommendationItem): string {
  return REC_KIND_META[item.kind]?.label ?? item.action
}

function recActionTone(item: RecommendationItem): string {
  return REC_KIND_META[item.kind]?.tone ?? 'muted'
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

  const [secondaryEnabled, setSecondaryEnabled] = useState(false)

  const usageBase =
    companyId && connectionId
      ? `/api/v1/cloud/oci/usage/${companyId}/connections/${connectionId}/usage`
      : null
  const recommendationsBase =
    companyId && connectionId
      ? `/api/v1/cloud/oci/recommendations/${companyId}/connections/${connectionId}/recommendations`
      : null
  const anomaliesBase =
    companyId && connectionId
      ? `/api/v1/cloud/oci/usage/${companyId}/connections/${connectionId}/usage/anomalies`
      : null

  // OCI is the only cloud today and `cloud` is not sent to the API, so `all` and
  // `oci` return identical data. Keep it out of the fetch key so toggling the
  // filter doesn't refetch. Add it back here once AWS/GCP change the query.
  const rangeKey = usageBase ? `${startDate}:${endDate}` : null
  const costKey = usageBase && rangeKey ? `${usageBase}/by-date:${rangeKey}` : null
  const breakdownKey = usageBase && rangeKey ? `${usageBase}/breakdown:${rangeKey}` : null
  const compartmentKey =
    usageBase && rangeKey ? `${usageBase}/by-compartment:${rangeKey}` : null
  // Recommendations / anomalies use a fixed 30-day window (same as their pages),
  // independent of the dashboard cost chart range.
  const recommendationsKey =
    recommendationsBase && secondaryEnabled ? `${recommendationsBase}:active:top5` : null
  const anomaliesKey = anomaliesBase && secondaryEnabled ? `${anomaliesBase}:top5` : null

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

  // Paint cost charts first; recommendations and anomalies are secondary calls.
  useEffect(() => {
    setSecondaryEnabled(false)
  }, [companyId, connectionId])

  useEffect(() => {
    if (!recommendationsBase && !anomaliesBase) {
      setSecondaryEnabled(false)
      return
    }
    if (costLoading && costSeries == null) return
    const t = window.setTimeout(() => setSecondaryEnabled(true), 50)
    return () => window.clearTimeout(t)
  }, [recommendationsBase, anomaliesBase, costLoading, costSeries])

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
    data: recommendations,
    error: recommendationsError,
    loading: recommendationsLoading,
  } = useAsyncData(
    async () => {
      if (!secondaryEnabled || !recommendationsBase) return null
      return apiRequest<RecommendationsResponse>(recommendationsBase, {
        query: {
          start_date: isoDaysAgo(30),
          end_date: isoDaysAgo(0),
          limit: 5,
          status: 'active',
        },
      })
    },
    [recommendationsKey],
    { keepPreviousData: true },
  )

  const {
    data: anomalies,
    error: anomaliesError,
    loading: anomaliesLoading,
  } = useAsyncData(
    async () => {
      if (!secondaryEnabled || !anomaliesBase) return null
      return apiRequest<SpendAnomaliesResponse>(anomaliesBase, {
        query: {
          start_date: isoDaysAgo(30),
          end_date: isoDaysAgo(0),
          limit: 5,
        },
      })
    },
    [anomaliesKey],
    { keepPreviousData: true },
  )

  const currency =
    costSeries?.currency ??
    breakdown?.currency ??
    compartmentBreakdown?.currency ??
    recommendations?.currency ??
    anomalies?.currency ??
    'USD'

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

  function applyPreset(next: RangePreset) {
    setPreset(next)
    if (next === 'custom') return
    const range = rangeForPreset(next)
    setStartDate(range.start)
    setEndDate(range.end)
  }

  const cloudLabel = cloud === 'all' ? 'All clouds' : 'OCI'
  const topRecommendations = recommendations?.items ?? []
  const topAnomalies = anomalies?.items ?? []

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
                  Top active recommendations (not silenced or ignored)
                </p>
              </div>
              {recommendationsError ? <Alert type="error">{recommendationsError}</Alert> : null}
              {!secondaryEnabled || (recommendationsLoading && recommendations == null) ? (
                <p className="loading">Loading recommendations…</p>
              ) : (
                <>
                  {recommendationsLoading && recommendations != null && (
                    <p className="dashboard-cost-updating" aria-live="polite">
                      Updating…
                    </p>
                  )}
                  {topRecommendations.length === 0 ? (
                    <p className="empty">No active recommendations right now.</p>
                  ) : (
                    <ul className="dashboard-opportunity-list">
                      {topRecommendations.map((item) => {
                        const tone = recActionTone(item)
                        const rowKey = `${item.resource_id ?? item.resource_name}:${item.kind}`
                        const name = item.resource_name ?? item.resource_id ?? 'unknown'
                        return (
                          <li key={rowKey} className="dashboard-opportunity-row">
                            <div className="dashboard-opportunity-main">
                              <Link
                                to="/oci/recommendations"
                                className="dashboard-opportunity-name"
                                title={item.resource_id ?? undefined}
                              >
                                {name}
                              </Link>
                              <span className={`recs-badge recs-badge--${tone}`}>
                                {recActionLabel(item)}
                              </span>
                            </div>
                            <p className="dashboard-opportunity-advice">{item.recommendation}</p>
                            <div className="dashboard-opportunity-meta">
                              <span>
                                save {formatMoney(item.estimated_monthly_savings, item.currency ?? currency)}
                                /mo
                              </span>
                              <span>{formatMoney(item.monthly_cost, item.currency ?? currency)} current</span>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <div className="dashboard-panel-footer">
                    <Link to="/oci/recommendations" className="btn-link">
                      View all recommendations
                    </Link>
                  </div>
                </>
              )}
            </section>

            <section className="card dashboard-cost-card dashboard-panel">
              <div className="dashboard-section-header">
                <h2>Cost anomalies</h2>
                <p className="dashboard-cost-subtitle">
                  Top spend spikes vs recent baseline
                </p>
              </div>
              {anomaliesError ? <Alert type="error">{anomaliesError}</Alert> : null}
              {!secondaryEnabled || (anomaliesLoading && anomalies == null) ? (
                <p className="loading">Loading anomalies…</p>
              ) : (
                <>
                  {anomaliesLoading && anomalies != null && (
                    <p className="dashboard-cost-updating" aria-live="polite">
                      Updating…
                    </p>
                  )}
                  {topAnomalies.length === 0 ? (
                    <p className="empty">No spend spikes in the last 30 days.</p>
                  ) : (
                    <ul className="dashboard-spike-list">
                      {topAnomalies.map((item) => (
                        <li key={item.date} className="dashboard-spike-row">
                          <div className="dashboard-spike-main">
                            <Link to="/oci/anomalies" className="dashboard-spike-date">
                              {formatDay(item.date)}
                            </Link>
                            <span className="dashboard-spike-delta">
                              +{formatMoney(item.delta, item.currency ?? currency)}
                            </span>
                          </div>
                          <div className="dashboard-spike-meta">
                            <span>
                              {formatMoney(item.total_cost, item.currency ?? currency)} vs{' '}
                              {formatMoney(item.baseline_avg, item.currency ?? currency)} typical
                            </span>
                            <span>{formatPct(item.pct_change)}</span>
                          </div>
                          <div className="dashboard-spike-meta">
                            <span>
                              {item.driver_service
                                ? `Driven by ${item.driver_service} (+${formatMoney(item.driver_delta, item.currency ?? currency)})`
                                : 'Mixed drivers'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="dashboard-panel-footer">
                    <Link to="/oci/anomalies" className="btn-link">
                      View all anomalies
                    </Link>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  )
}
