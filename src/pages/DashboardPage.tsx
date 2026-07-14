import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import TimeSeriesChart from '@/components/TimeSeriesChart'
import { Alert } from '@/components/Alert'

type RangePreset = 'day' | '3m' | '12m' | 'custom'
type CloudFilter = 'oci'

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

function formatMoney(amount: number | null | undefined, currency: string | null): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  const code = currency && currency.trim() ? currency.trim().toUpperCase() : 'USD'
  try {
    return Number(amount).toLocaleString(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    })
  } catch {
    return `$${Number(amount).toFixed(2)}`
  }
}

export default function DashboardPage() {
  const { user, activeCompany, connection, connections } = useAuth()
  const defaults = rangeForPreset('3m')
  const [preset, setPreset] = useState<RangePreset>('3m')
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [cloud, setCloud] = useState<CloudFilter>('oci')

  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id

  const firstName = user?.first_name?.trim()
  const greetingName = firstName || user?.email || 'there'
  const hasConnection = Boolean(connectionId)
  const hasCompany = Boolean(companyId)

  let support =
    'Explore OCI inventory, usage, and monitoring for the companies connected to this tester.'
  if (hasCompany && hasConnection) {
    support = `You’re viewing ${activeCompany!.name} through ${
      connection!.name ?? 'your selected connection'
    }. Sync inventory or pull usage to exercise the APIs.`
  } else if (hasCompany && connections.length === 0) {
    support = `${activeCompany!.name} is selected, but there’s no OCI connection yet. Add one to unlock inventory and usage sync.`
  } else if (hasCompany) {
    support = `${activeCompany!.name} is selected. Pick a connection in the top bar to work with OCI data.`
  }

  const usageBase =
    companyId && connectionId
      ? `/api/v1/cloud/oci/usage/${companyId}/connections/${connectionId}/usage`
      : null

  const costKey =
    usageBase && cloud === 'oci' ? `${usageBase}/by-date:${startDate}:${endDate}` : null

  const {
    data: costSeries,
    error: costError,
    loading: costLoading,
  } = useAsyncData(
    () => {
      if (!usageBase || cloud !== 'oci') {
        return Promise.resolve(null)
      }
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

  function applyPreset(next: RangePreset) {
    setPreset(next)
    if (next === 'custom') return
    const range = rangeForPreset(next)
    setStartDate(range.start)
    setEndDate(range.end)
  }

  return (
    <>
      <section className="dashboard-welcome">
        <h1 className="dashboard-greeting">Welcome back, {greetingName}</h1>
        <p className="dashboard-support">{support}</p>

        {(hasCompany || hasConnection) && (
          <p className="dashboard-context">
            {hasCompany && (
              <>
                Company <strong>{activeCompany!.name}</strong>
              </>
            )}
            {hasCompany && hasConnection && ' · '}
            {hasConnection && (
              <>
                Connection <strong>{connection!.name ?? connection!.connection_id.slice(0, 8)}</strong>
              </>
            )}
          </p>
        )}

        <div className="dashboard-actions">
          {hasConnection ? (
            <>
              <Link to="/oci/inventory" className="btn btn-primary">
                Open inventory
              </Link>
              <Link to="/oci/usage" className="btn">
                Usage & costs
              </Link>
            </>
          ) : (
            <>
              <Link to="/oci/connections" className="btn btn-primary">
                Set up a connection
              </Link>
              <Link to="/oci/inventory" className="btn">
                Inventory
              </Link>
            </>
          )}
        </div>
      </section>

      {hasCompany && hasConnection ? (
        <section className="card dashboard-cost-card">
          <div className="dashboard-cost-header">
            <div>
              <h2>Total cost</h2>
              <p className="dashboard-cost-subtitle">
                Daily spend · {formatMoney(periodTotal, costSeries?.currency ?? 'USD')} in range
              </p>
            </div>
            <label className="dashboard-cloud-filter">
              Cloud
              <select value={cloud} onChange={(e) => setCloud(e.target.value as CloudFilter)}>
                <option value="oci">OCI</option>
              </select>
            </label>
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
      ) : (
        <p className="empty">Select a company and OCI connection to view daily total cost.</p>
      )}
    </>
  )
}
