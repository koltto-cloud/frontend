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
  resource_type: string
  kind: 'idle' | 'oversized' | 'overutilized' | 'idle_storage' | 'idle_lb'
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

const KIND_ACTION: Record<RecommendationItem['kind'], { action: string; color: string }> = {
  idle: { action: 'Stop', color: '#e5484d' },
  idle_storage: { action: 'Review', color: '#e5484d' },
  idle_lb: { action: 'Delete', color: '#e5484d' },
  oversized: { action: 'Downsize', color: '#f5a623' },
  overutilized: { action: 'Scale up', color: '#d6409f' },
}

const TYPE_LABEL: Record<string, string> = {
  compute: 'Compute',
  block_storage: 'Block storage',
  file_storage: 'File storage',
  load_balancer: 'Load balancer',
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

function metricPhrase(item: RecommendationItem): string {
  if (item.resource_type === 'load_balancer') return 'no traffic'
  if (item.resource_type === 'block_storage' || item.resource_type === 'file_storage') {
    return 'near-zero I/O'
  }
  return `CPU ${pct(item.cpu_avg)} · Mem ${pct(item.mem_avg)}`
}

export default function RecommendationsPage() {
  const { activeCompany, connection } = useAuth()
  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id

  const [startDate] = useState(isoDaysAgo(30))
  const [endDate] = useState(isoDaysAgo(0))

  const url =
    companyId && connectionId
      ? `/api/v1/cloud/oci/recommendations/${companyId}/connections/${connectionId}/recommendations`
      : null

  const { data, error, loading } = useAsyncData(
    () => {
      if (!url) return Promise.resolve(null)
      return apiRequest<RecommendationsResponse>(url, {
        query: { start_date: startDate, end_date: endDate, limit: 100 },
      })
    },
    [url ? `${url}:${startDate}:${endDate}` : null],
    { keepPreviousData: true },
  )

  const currency = data?.currency ?? 'USD'
  const items = useMemo(() => data?.items ?? [], [data])
  const savingsCount = items.filter((i) => i.estimated_monthly_savings > 0).length
  const alertsCount = items.length - savingsCount

  const hasCompany = Boolean(companyId)
  const hasConnection = Boolean(connectionId)

  return (
    <div className="page">
      <header className="dashboard-header">
        <h1 className="page-title">Recommendations</h1>
        <p className="page-lead">
          Where your resources cost more than they’re used — with the fix and the savings. Last 30
          days.
        </p>
      </header>

      {!hasCompany || !hasConnection ? (
        <p className="empty">
          Select a company and OCI connection in the top bar to see recommendations.
          {!hasConnection && hasCompany && (
            <>
              {' '}
              <Link to="/connections">Set up a connection</Link>
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
              <section
                className="card"
                style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16 }}
              >
                <div>
                  <span className="dashboard-cost-stat-label">Potential monthly savings</span>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    {formatMoney(data?.total_estimated_monthly_savings ?? 0, currency)}
                  </div>
                </div>
                <span className="page-lead" style={{ fontSize: 13 }}>
                  {savingsCount} savings · {alertsCount} performance alert{alertsCount === 1 ? '' : 's'}
                </span>
              </section>

              {items.length === 0 ? (
                <p className="empty">
                  No recommendations — resources look right-sized for the last 30 days. (Needs both
                  cost and monitoring data synced.)
                </p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                  {items.map((item) => {
                    const meta = KIND_ACTION[item.kind]
                    const isSaving = item.estimated_monthly_savings > 0
                    return (
                      <li
                        key={item.resource_id ?? item.resource_name}
                        className="card"
                        style={{ padding: '10px 14px' }}
                        title={item.summary}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: meta.color,
                                border: `1px solid ${meta.color}`,
                                borderRadius: 4,
                                padding: '1px 7px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {meta.action}
                            </span>
                            <span style={{ minWidth: 0 }}>
                              <strong
                                style={{
                                  fontSize: 14,
                                  display: 'inline-block',
                                  maxWidth: 260,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  verticalAlign: 'bottom',
                                }}
                                title={item.resource_id ?? undefined}
                              >
                                {item.resource_name ?? item.resource_id ?? 'unknown'}
                              </strong>
                              <span className="page-lead" style={{ fontSize: 12, marginLeft: 8 }}>
                                {TYPE_LABEL[item.resource_type] ?? item.resource_type} ·{' '}
                                {metricPhrase(item)}
                                {item.confidence === 'low' ? ' · low confidence' : ''}
                              </span>
                            </span>
                          </div>
                          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {isSaving ? (
                              <span style={{ fontWeight: 700, color: '#2e9e5b' }}>
                                save ~{formatMoney(item.estimated_monthly_savings, currency)}/mo
                              </span>
                            ) : (
                              <span style={{ fontWeight: 700, color: meta.color }}>
                                performance risk
                              </span>
                            )}
                            <span className="page-lead" style={{ fontSize: 12, marginLeft: 8 }}>
                              {formatMoney(item.monthly_cost, currency)}/mo
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, marginTop: 4 }}>→ {item.recommendation}</div>
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
