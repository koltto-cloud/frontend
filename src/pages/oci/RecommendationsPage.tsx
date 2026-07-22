import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'

interface RecommendationItem {
  resource_id: string | null
  resource_name: string | null
  service: string | null
  kind: 'idle' | 'oversized' | 'overutilized'
  severity: 'high' | 'medium' | 'low'
  monthly_cost: number
  currency: string | null
  cpu_avg: number | null
  cpu_p95: number | null
  mem_avg: number | null
  mem_p95: number | null
  estimated_monthly_savings: number
  summary: string
  recommendation: string
  confidence: 'high' | 'low'
  metric_days: number
}

interface RecommendationsResponse {
  start_date: string
  end_date: string
  currency: string | null
  total_estimated_monthly_savings: number
  items: RecommendationItem[]
}

const KIND_META: Record<RecommendationItem['kind'], { label: string; action: string; color: string }> = {
  idle: { label: 'Idle', action: 'Stop', color: '#e5484d' },
  oversized: { label: 'Underused', action: 'Downsize', color: '#f5a623' },
  overutilized: { label: 'Running hot', action: 'Scale up', color: '#d6409f' },
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function formatMoney(amount: number | null | undefined, currency: string | null): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  const raw = (currency && currency.trim() ? currency.trim() : 'USD').toUpperCase()
  const code = raw === 'US$' || raw === 'USA' ? 'USD' : raw
  try {
    return Number(amount).toLocaleString(undefined, {
      style: 'currency',
      currency: code.length === 3 ? code : 'USD',
      maximumFractionDigits: 0,
    })
  } catch {
    return `$${Number(amount).toFixed(0)}`
  }
}

function pct(value: number | null): string {
  return value == null || Number.isNaN(value) ? 'n/a' : `${value.toFixed(0)}%`
}

export default function RecommendationsPage() {
  const { activeCompany, connection } = useAuth()
  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id

  const [startDate] = useState(isoDaysAgo(30))
  const [endDate] = useState(isoDaysAgo(0))

  const base =
    companyId && connectionId
      ? `/api/v1/cloud/oci/recommendations/${companyId}/connections/${connectionId}/recommendations`
      : null
  const key = base ? `${base}/compute:${startDate}:${endDate}` : null

  const { data, error, loading } = useAsyncData(
    () => {
      if (!base) return Promise.resolve(null)
      return apiRequest<RecommendationsResponse>(`${base}/compute`, {
        query: { start_date: startDate, end_date: endDate, limit: 50 },
      })
    },
    [key],
    { keepPreviousData: true },
  )

  const currency = data?.currency ?? 'USD'
  const items = useMemo(() => data?.items ?? [], [data])
  const savingsItems = items.filter((i) => i.estimated_monthly_savings > 0)

  const hasCompany = Boolean(companyId)
  const hasConnection = Boolean(connectionId)

  return (
    <div className="page">
      <header className="dashboard-header">
        <h1 className="page-title">Recommendations</h1>
        <p className="page-lead">
          Where your compute is costing more than it’s using — with what to do and how much you
          could save. Based on the last 30 days of cost and utilization.
        </p>
      </header>

      {!hasCompany || !hasConnection ? (
        <p className="empty">
          Select a company and OCI connection in the top bar to see recommendations.
          {!hasConnection && hasCompany && (
            <>
              {' '}
              <Link to="/oci/connections">Set up a connection</Link>
            </>
          )}
        </p>
      ) : (
        <>
          <Alert type="error">{error}</Alert>

          {loading && !data ? (
            <p className="loading">Analyzing cost vs utilization…</p>
          ) : (
            <>
              <section className="card" style={{ marginBottom: 20 }}>
                <p className="dashboard-cost-stat-label">Potential monthly savings</p>
                <p style={{ fontSize: 28, fontWeight: 700, margin: '4px 0 0' }}>
                  {formatMoney(data?.total_estimated_monthly_savings ?? 0, currency)}
                </p>
                <p className="page-lead" style={{ marginTop: 4 }}>
                  {savingsItems.length} savings opportunit{savingsItems.length === 1 ? 'y' : 'ies'}
                  {items.length > savingsItems.length
                    ? ` · ${items.length - savingsItems.length} performance alert(s)`
                    : ''}
                </p>
              </section>

              {items.length === 0 ? (
                <p className="empty">
                  No recommendations — your compute looks right-sized for the last 30 days. (This
                  needs both cost and monitoring data; make sure usage and monitoring have synced.)
                </p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
                  {items.map((item) => {
                    const meta = KIND_META[item.kind]
                    const isSaving = item.estimated_monthly_savings > 0
                    return (
                      <li key={item.resource_id ?? item.resource_name} className="card">
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 12,
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: meta.color,
                                border: `1px solid ${meta.color}`,
                                borderRadius: 4,
                                padding: '1px 8px',
                              }}
                            >
                              {meta.action}
                            </span>
                            <strong style={{ fontSize: 16 }} title={item.resource_id ?? undefined}>
                              {item.resource_name ?? item.resource_id ?? 'unknown'}
                            </strong>
                            {item.confidence === 'low' && (
                              <span className="page-lead" style={{ fontSize: 12 }}>
                                low confidence · {item.metric_days}d data
                              </span>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {isSaving ? (
                              <>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#2e9e5b' }}>
                                  save ~{formatMoney(item.estimated_monthly_savings, currency)}/mo
                                </div>
                                <div className="page-lead" style={{ fontSize: 12 }}>
                                  costs {formatMoney(item.monthly_cost, currency)}/mo
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>
                                  performance risk
                                </div>
                                <div className="page-lead" style={{ fontSize: 12 }}>
                                  costs {formatMoney(item.monthly_cost, currency)}/mo
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <p style={{ margin: '10px 0 6px' }}>{item.summary}</p>
                        <p style={{ margin: 0, fontWeight: 600 }}>→ {item.recommendation}</p>

                        <div className="page-lead" style={{ fontSize: 12, marginTop: 8 }}>
                          CPU avg {pct(item.cpu_avg)} (p95 {pct(item.cpu_p95)}) · Memory avg{' '}
                          {pct(item.mem_avg)} ·{' '}
                          <Link to="/oci/monitoring">view metrics</Link>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
