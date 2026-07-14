import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import TimeSeriesChart from '@/components/TimeSeriesChart'
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

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function rangeForPreset(preset: RangePreset): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  if (preset === 'day') {
    start.setDate(start.getDate() - 1)
  } else if (preset === '3m') {
    start.setMonth(start.getMonth() - 3)
  } else if (preset === '12m') {
    start.setMonth(start.getMonth() - 12)
  }
  return { start: toIsoDate(start), end: toIsoDate(end) }
}

function daysInclusive(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`)
  const b = new Date(`${end}T00:00:00Z`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1
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

  const usageBase =
    companyId && connectionId
      ? `/api/v1/cloud/oci/usage/${companyId}/connections/${connectionId}/usage`
      : null

  // OCI is the only cloud today; `all` uses the same series until AWS/GCP exist.
  const costKey = usageBase ? `${usageBase}/by-date:${cloud}:${startDate}:${endDate}` : null

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
  )

  const chartPoints = useMemo(
    () =>
      (costSeries?.items ?? []).map((item) => ({
        t: item.date,
        value: item.total_cost,
      })),
    [costSeries],
  )

  const periodTotal = useMemo(
    () => (costSeries?.items ?? []).reduce((sum, item) => sum + (item.total_cost || 0), 0),
    [costSeries],
  )

  const dayCount = daysInclusive(startDate, endDate)
  const dailyAverage = dayCount > 0 ? periodTotal / dayCount : null

  function applyPreset(next: RangePreset) {
    setPreset(next)
    if (next === 'custom') return
    const range = rangeForPreset(next)
    setStartDate(range.start)
    setEndDate(range.end)
  }

  const cloudLabel = cloud === 'all' ? 'All clouds' : 'OCI'

  return (
    <>
      <header className="dashboard-header">
        <h1 className="page-title dashboard-title">Dashboard</h1>
        <p className="dashboard-greeting-line">Hi {greetingName} — here’s your cloud spend overview.</p>
      </header>

      {!hasCompany || !hasConnection ? (
        <p className="empty">
          Select a company and OCI connection in the top bar to view daily total cost.
          {!hasConnection && hasCompany && (
            <>
              {' '}
              <Link to="/oci/connections">Set up a connection</Link>
            </>
          )}
        </p>
      ) : (
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
                {formatMoney(periodTotal, costSeries?.currency ?? 'USD')}
              </span>
            </div>
            <div className="dashboard-cost-stat">
              <span className="dashboard-cost-stat-label">Daily average</span>
              <span className="dashboard-cost-stat-value">
                {formatMoney(dailyAverage, costSeries?.currency ?? 'USD')}
              </span>
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

          {costLoading ? (
            <p className="loading">Loading cost series…</p>
          ) : (
            <TimeSeriesChart
              points={chartPoints}
              valueLabel="Cost"
              valuePrefix="$"
              dateOnly
              height={300}
            />
          )}
        </section>
      )}
    </>
  )
}
