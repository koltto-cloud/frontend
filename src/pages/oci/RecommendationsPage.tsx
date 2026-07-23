import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useOciCompartments } from '@/hooks/useOciCompartments'
import { Alert } from '@/components/Alert'
import PageHeader from '@/components/PageHeader'
import { recommendationsHelp } from '@/content/pageHelp'

type RecKind =
  | 'idle'
  | 'oversized'
  | 'overutilized'
  | 'idle_storage'
  | 'idle_lb'
  | 'unattached_volume'

type RecAction = 'stop' | 'review' | 'terminate' | 'downsize' | 'scale_up'
type SilenceStatus = 'active' | 'silenced' | 'all'
type CloudFilter = '' | 'oci' | 'aws' | 'gcp'

interface RecommendationItem {
  resource_id: string | null
  resource_name: string | null
  service: string | null
  resource_type: string
  kind: RecKind
  action: RecAction
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
  compartment_id?: string | null
  cloud?: string
  silenced?: boolean
  silence_id?: string | null
  silenced_until?: string | null
}

interface RecommendationsResponse {
  start_date: string
  end_date: string
  currency: string | null
  total_estimated_monthly_savings: number
  items: RecommendationItem[]
}

const KIND_ACTION: Record<RecKind, { action: string; color: string }> = {
  idle: { action: 'Stop', color: '#c23b3b' },
  idle_storage: { action: 'Review', color: '#c23b3b' },
  idle_lb: { action: 'Terminate', color: '#c23b3b' },
  unattached_volume: { action: 'Terminate', color: '#c23b3b' },
  oversized: { action: 'Downsize', color: '#b7791f' },
  overutilized: { action: 'Scale up', color: '#9b3d7a' },
}

const TYPE_LABEL: Record<string, string> = {
  compute: 'Compute',
  block_storage: 'Block storage',
  file_storage: 'File storage',
  load_balancer: 'Load balancer',
}

const ACTION_OPTIONS: { value: '' | RecAction; label: string }[] = [
  { value: '', label: 'All actions' },
  { value: 'downsize', label: 'Downsize' },
  { value: 'review', label: 'Review' },
  { value: 'terminate', label: 'Terminate' },
  { value: 'stop', label: 'Stop' },
  { value: 'scale_up', label: 'Scale up' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'compute', label: 'Compute' },
  { value: 'block_storage', label: 'Block storage' },
  { value: 'file_storage', label: 'File storage' },
  { value: 'load_balancer', label: 'Load balancer' },
]

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
  if (item.kind === 'unattached_volume') return 'unattached'
  if (item.resource_type === 'load_balancer') return 'no traffic'
  if (item.resource_type === 'block_storage' || item.resource_type === 'file_storage') {
    return 'near-zero I/O'
  }
  return `CPU ${pct(item.cpu_avg)} · Mem ${pct(item.mem_avg)}`
}

function actionLabel(item: RecommendationItem): string {
  return KIND_ACTION[item.kind]?.action ?? item.action
}

function actionColor(item: RecommendationItem): string {
  return KIND_ACTION[item.kind]?.color ?? '#64748b'
}

export default function RecommendationsPage() {
  const { activeCompany, connection } = useAuth()
  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id
  const { compartments } = useOciCompartments(companyId, connectionId)

  const [startDate] = useState(isoDaysAgo(30))
  const [endDate] = useState(isoDaysAgo(0))
  const [resourceType, setResourceType] = useState('')
  const [action, setAction] = useState<'' | RecAction>('')
  const [compartmentId, setCompartmentId] = useState('')
  const [status, setStatus] = useState<SilenceStatus>('active')
  const [cloud, setCloud] = useState<CloudFilter>('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const compartmentNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of compartments) map[c.compartment_ocid] = c.name
    return map
  }, [compartments])

  const url =
    companyId && connectionId
      ? `/api/v1/cloud/oci/recommendations/${companyId}/connections/${connectionId}/recommendations`
      : null

  const queryKey = [
    url,
    startDate,
    endDate,
    resourceType,
    action,
    compartmentId,
    status,
    cloud,
  ].join('|')

  const { data, error, loading, reload } = useAsyncData(
    () => {
      if (!url) return Promise.resolve(null)
      const query: Record<string, string | number> = {
        start_date: startDate,
        end_date: endDate,
        limit: 100,
        status,
      }
      if (resourceType) query.resource_type = resourceType
      if (action) query.action = action
      if (compartmentId) query.compartment_id = compartmentId
      if (cloud) query.cloud = cloud
      return apiRequest<RecommendationsResponse>(url, { query })
    },
    [queryKey],
    { keepPreviousData: true },
  )

  const currency = data?.currency ?? 'USD'
  const items = useMemo(() => data?.items ?? [], [data])
  const savingsCount = items.filter((i) => !i.silenced && i.estimated_monthly_savings > 0).length
  const alertsCount = items.filter((i) => !i.silenced && i.estimated_monthly_savings <= 0).length

  const hasCompany = Boolean(companyId)
  const hasConnection = Boolean(connectionId)

  async function silenceItem(item: RecommendationItem, days: number | null) {
    if (!companyId || !connectionId || !item.resource_id) return
    const key = `${item.resource_id}:${item.kind}:silence`
    setBusyKey(key)
    setActionError(null)
    try {
      await apiRequest(
        `/api/v1/cloud/oci/recommendations/${companyId}/connections/${connectionId}/recommendations/silences`,
        {
          method: 'POST',
          body: {
            resource_id: item.resource_id,
            kind: item.kind,
            days,
          },
        },
      )
      await reload()
    } catch (err) {
      setActionError(formatApiError(err) || 'Could not silence recommendation')
    } finally {
      setBusyKey(null)
    }
  }

  async function unsilienceItem(item: RecommendationItem) {
    if (!companyId || !connectionId || !item.silence_id) return
    const key = `${item.resource_id}:${item.kind}:unsilence`
    setBusyKey(key)
    setActionError(null)
    try {
      await apiRequest(
        `/api/v1/cloud/oci/recommendations/${companyId}/connections/${connectionId}/recommendations/silences/${item.silence_id}`,
        { method: 'DELETE' },
      )
      await reload()
    } catch (err) {
      setActionError(formatApiError(err) || 'Could not clear silence')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="page recommendations-page">
      <PageHeader
        title="Recommendations"
        lead="Where resources cost more than they’re used — with the fix and the savings."
        helpTitle="About Recommendations"
        help={recommendationsHelp}
      />

      {!hasCompany || !hasConnection ? (
        <p className="empty">
          Select a company and cloud connection in the top bar to see recommendations.
          {!hasConnection && hasCompany && (
            <>
              {' '}
              <Link to="/connections">Set up a connection</Link>
            </>
          )}
        </p>
      ) : (
        <>
          <div className="filters recommendations-filters">
            <label>
              Cloud
              <select value={cloud} onChange={(e) => setCloud(e.target.value as CloudFilter)}>
                <option value="">All clouds</option>
                <option value="oci">OCI</option>
                <option value="aws" disabled>
                  AWS (soon)
                </option>
                <option value="gcp" disabled>
                  GCP (soon)
                </option>
              </select>
            </label>
            <label>
              Resource type
              <select value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Action
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as '' | RecAction)}
              >
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Scope
              <select value={compartmentId} onChange={(e) => setCompartmentId(e.target.value)}>
                <option value="">All scopes</option>
                {compartments.map((c) => (
                  <option key={c.compartment_ocid} value={c.compartment_ocid}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SilenceStatus)}
              >
                <option value="active">Active</option>
                <option value="silenced">Silenced</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>

          <Alert type="error">{error || actionError}</Alert>

          {loading && !data ? (
            <p className="loading">Analyzing cost vs utilization…</p>
          ) : (
            <>
              <section className="recommendations-summary" aria-live="polite">
                <div>
                  <span className="dashboard-cost-stat-label">Potential monthly savings</span>
                  <div className="recommendations-summary-value">
                    {formatMoney(data?.total_estimated_monthly_savings ?? 0, currency)}
                  </div>
                </div>
                <p className="page-lead recommendations-summary-meta">
                  {savingsCount} savings · {alertsCount} performance alert
                  {alertsCount === 1 ? '' : 's'}
                  {loading ? ' · updating…' : ''}
                </p>
              </section>

              {items.length === 0 ? (
                <p className="empty">
                  No recommendations for these filters. Try All status, or sync cost and monitoring
                  for the last 30 days.
                </p>
              ) : (
                <ul className="recommendations-list">
                  {items.map((item) => {
                    const color = actionColor(item)
                    const isSaving = item.estimated_monthly_savings > 0
                    const scopeName =
                      (item.compartment_id && compartmentNames[item.compartment_id]) || null
                    const rowKey = `${item.resource_id ?? item.resource_name}:${item.kind}`
                    const silenceBusy = busyKey === `${item.resource_id}:${item.kind}:silence`
                    const unsilienceBusy =
                      busyKey === `${item.resource_id}:${item.kind}:unsilence`
                    return (
                      <li
                        key={rowKey}
                        className={`recommendations-row${item.silenced ? ' is-silenced' : ''}`}
                        title={item.summary}
                      >
                        <div className="recommendations-row-main">
                          <div className="recommendations-row-identity">
                            <span
                              className="recommendations-action"
                              style={{ color, borderColor: color }}
                            >
                              {actionLabel(item)}
                            </span>
                            <div className="recommendations-row-text">
                              <strong title={item.resource_id ?? undefined}>
                                {item.resource_name ?? item.resource_id ?? 'unknown'}
                              </strong>
                              <span className="page-lead recommendations-row-meta">
                                {TYPE_LABEL[item.resource_type] ?? item.resource_type}
                                {scopeName ? ` · ${scopeName}` : ''}
                                {' · '}
                                {metricPhrase(item)}
                                {item.confidence === 'low' ? ' · low confidence' : ''}
                                {item.silenced ? ' · silenced' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="recommendations-row-cost">
                            {isSaving ? (
                              <span className="recommendations-savings">
                                save ~{formatMoney(item.estimated_monthly_savings, currency)}/mo
                              </span>
                            ) : (
                              <span className="recommendations-risk" style={{ color }}>
                                performance risk
                              </span>
                            )}
                            <span className="page-lead">
                              {formatMoney(item.monthly_cost, currency)}/mo
                            </span>
                          </div>
                        </div>
                        <div className="recommendations-row-footer">
                          <p className="recommendations-advice">→ {item.recommendation}</p>
                          <div className="recommendations-row-actions">
                            {item.silenced ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                disabled={unsilienceBusy}
                                onClick={() => void unsilienceItem(item)}
                              >
                                {unsilienceBusy ? '…' : 'Unsilence'}
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-ghost"
                                  disabled={silenceBusy}
                                  onClick={() => void silenceItem(item, 30)}
                                >
                                  {silenceBusy ? '…' : 'Silence 30d'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-ghost"
                                  disabled={silenceBusy}
                                  onClick={() => void silenceItem(item, null)}
                                >
                                  Ignore
                                </button>
                              </>
                            )}
                          </div>
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
