import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useOciCompartments } from '@/hooks/useOciCompartments'
import { Alert } from '@/components/Alert'
import PageHeader from '@/components/PageHeader'
import { recommendationsHelp } from '@/content/pageHelp'
import { recommendationAdvice } from '@/oci/recommendationCopy'

type RecKind =
  | 'idle'
  | 'oversized'
  | 'overutilized'
  | 'idle_storage'
  | 'idle_lb'
  | 'unattached_volume'

type RecAction = 'stop' | 'review' | 'terminate' | 'downsize' | 'scale_up'
type SilenceStatus = 'active' | 'silenced' | 'all'

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

const KIND_META: Record<RecKind, { label: string; tone: string }> = {
  idle: { label: 'Stop', tone: 'danger' },
  idle_storage: { label: 'Review', tone: 'warning' },
  idle_lb: { label: 'Terminate', tone: 'danger' },
  unattached_volume: { label: 'Terminate', tone: 'danger' },
  oversized: { label: 'Downsize', tone: 'warning' },
  overutilized: { label: 'Scale up', tone: 'accent' },
}

const ACTION_FILTERS: { value: RecAction; label: string }[] = [
  { value: 'terminate', label: 'Terminate' },
  { value: 'downsize', label: 'Downsize' },
  { value: 'review', label: 'Review' },
  { value: 'stop', label: 'Stop' },
  { value: 'scale_up', label: 'Scale up' },
]

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'compute', label: 'Compute' },
  { value: 'block_storage', label: 'Block storage' },
  { value: 'file_storage', label: 'File storage' },
  { value: 'load_balancer', label: 'Load balancer' },
]

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
  const code = raw === 'US$' || raw === 'USA' || raw === '$' ? 'USD' : raw
  const value = Number(amount)
  const digits = Math.abs(value) > 0 && Math.abs(value) < 10 ? 2 : 0
  try {
    // Force en-US so USD renders as "$" (some locales show "US$").
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: code.length === 3 ? code : 'USD',
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    })
  } catch {
    return `$${value.toFixed(digits)}`
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
  return KIND_META[item.kind]?.label ?? item.action
}

function actionTone(item: RecommendationItem): string {
  return KIND_META[item.kind]?.tone ?? 'muted'
}

/** Projected monthly cost if the recommendation is applied. */
function costAfter(item: RecommendationItem): number | null {
  if (item.estimated_monthly_savings <= 0) return null
  return Math.max(0, item.monthly_cost - item.estimated_monthly_savings)
}

function RowMenu({
  item,
  busy,
  onSilence,
  onUnsilence,
}: {
  item: RecommendationItem
  busy: boolean
  onSilence: (days: number | null) => void
  onUnsilence: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="recs-row-menu" ref={rootRef}>
      <button
        type="button"
        className="btn btn-sm btn-ghost recs-row-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? '…' : '⋮'}
      </button>
      {open ? (
        <div className="recs-row-menu-panel" role="menu">
          {item.silenced ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onUnsilence()
              }}
            >
              Unsilence
            </button>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onSilence(30)
                }}
              >
                Silence 30 days
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onSilence(null)
                }}
              >
                Ignore
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function RecommendationsPage() {
  const { t } = useTranslation()
  const { activeCompany, connection } = useAuth()
  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id
  const { compartments } = useOciCompartments(companyId, connectionId)

  const [startDate] = useState(isoDaysAgo(30))
  const [endDate] = useState(isoDaysAgo(0))
  const [actionFilter, setActionFilter] = useState<'' | RecAction>('')
  const [resourceType, setResourceType] = useState('')
  const [compartmentId, setCompartmentId] = useState('')
  const [status, setStatus] = useState<SilenceStatus>('active')
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

  // Fetch without action/type so summary cards keep accurate counts.
  const queryKey = [url, startDate, endDate, compartmentId, status].join('|')

  const { data, error, loading, reload } = useAsyncData(
    () => {
      if (!url) return Promise.resolve(null)
      const query: Record<string, string | number> = {
        start_date: startDate,
        end_date: endDate,
        limit: 200,
        status,
      }
      if (compartmentId) query.compartment_id = compartmentId
      return apiRequest<RecommendationsResponse>(url, { query })
    },
    [queryKey],
    { keepPreviousData: true },
  )

  const currency = data?.currency ?? 'USD'
  const allItems = useMemo(() => data?.items ?? [], [data])

  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of allItems) {
      counts[item.action] = (counts[item.action] ?? 0) + 1
    }
    return counts
  }, [allItems])

  const items = useMemo(() => {
    return allItems.filter((item) => {
      if (actionFilter && item.action !== actionFilter) return false
      if (resourceType && item.resource_type !== resourceType) return false
      return true
    })
  }, [allItems, actionFilter, resourceType])

  const filteredSavings = useMemo(
    () =>
      items
        .filter((i) => !i.silenced)
        .reduce((sum, i) => sum + (i.estimated_monthly_savings || 0), 0),
    [items],
  )

  const hasCompany = Boolean(companyId)
  const hasConnection = Boolean(connectionId)

  async function silenceItem(item: RecommendationItem, days: number | null) {
    if (!companyId || !connectionId || !item.resource_id) return
    const key = `${item.resource_id}:${item.kind}`
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
    const key = `${item.resource_id}:${item.kind}`
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
        title={t('pages.recommendations.title')}
        lead={t('pages.recommendations.lead')}
        helpTitle={t('pages.recommendations.helpTitle')}
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
          <Alert type="error">{error || actionError}</Alert>

          {loading && !data ? (
            <p className="loading">Analyzing cost vs utilization…</p>
          ) : (
            <>
              <section className="recs-stat-grid" aria-label="Recommendation filters">
                <button
                  type="button"
                  className={`recs-stat-card recs-stat-card--savings${actionFilter === '' ? ' is-active' : ''}`}
                  onClick={() => setActionFilter('')}
                >
                  <div className="recs-stat-card-body">
                    <div className="recs-stat-value">
                      {formatMoney(
                        actionFilter || resourceType
                          ? filteredSavings
                          : (data?.total_estimated_monthly_savings ?? 0),
                        currency,
                      )}
                    </div>
                    <div className="recs-stat-label">Potential savings / mo</div>
                  </div>
                  <span className="recs-stat-hint">All actions</span>
                </button>

                {ACTION_FILTERS.map((f) => {
                  const count = actionCounts[f.value] ?? 0
                  const active = actionFilter === f.value
                  return (
                    <button
                      key={f.value}
                      type="button"
                      className={`recs-stat-card${active ? ' is-active' : ''}`}
                      onClick={() => setActionFilter(active ? '' : f.value)}
                      disabled={count === 0 && !active}
                    >
                      <div className="recs-stat-card-body">
                        <div className="recs-stat-value">{count}</div>
                        <div className="recs-stat-label">{f.label}</div>
                      </div>
                    </button>
                  )
                })}
              </section>

              <section className="recs-panel">
                <div className="recs-panel-toolbar">
                  <div className="tabs recs-status-tabs" role="tablist" aria-label="Recommendation status">
                    {(
                      [
                        ['active', 'Active'],
                        ['silenced', 'Silenced'],
                        ['all', 'All'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={status === value}
                        className={`tab${status === value ? ' active' : ''}`}
                        onClick={() => setStatus(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="recs-panel-filters">
                    <label>
                      Type
                      <select
                        value={resourceType}
                        onChange={(e) => setResourceType(e.target.value)}
                      >
                        {TYPE_FILTERS.map((o) => (
                          <option key={o.value || 'all'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Scope
                      <select
                        value={compartmentId}
                        onChange={(e) => setCompartmentId(e.target.value)}
                      >
                        <option value="">All scopes</option>
                        {compartments.map((c) => (
                          <option key={c.compartment_ocid} value={c.compartment_ocid}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                {items.length === 0 ? (
                  <p className="empty" style={{ margin: '1rem 0 0' }}>
                    No recommendations for these filters. Try another status, or sync cost and
                    monitoring for the last 30 days.
                  </p>
                ) : (
                  <div className="data-table-wrap recs-table-wrap">
                    <table className="data-table recs-table">
                      <thead>
                        <tr>
                          <th className="recs-col-action">Action</th>
                          <th className="recs-col-resource">Resource</th>
                          <th className="recs-col-rec">Recommendation</th>
                          <th className="recs-col-cost">Cost</th>
                          <th className="recs-col-menu">
                            <span className="sr-only">Row actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const tone = actionTone(item)
                          const after = costAfter(item)
                          const scopeName =
                            (item.compartment_id && compartmentNames[item.compartment_id]) ||
                            null
                          const rowKey = `${item.resource_id ?? item.resource_name}:${item.kind}`
                          const busy = busyKey === `${item.resource_id}:${item.kind}`
                          return (
                            <tr
                              key={rowKey}
                              className={item.silenced ? 'is-silenced' : undefined}
                              title={item.summary}
                            >
                              <td className="recs-col-action">
                                <span className={`recs-badge recs-badge--${tone}`}>
                                  {actionLabel(item)}
                                </span>
                              </td>
                              <td className="recs-col-resource">
                                <div
                                  className="recs-resource-name"
                                  title={item.resource_id ?? undefined}
                                >
                                  {item.resource_name ?? item.resource_id ?? 'unknown'}
                                </div>
                                <div className="recs-resource-meta">
                                  {TYPE_LABEL[item.resource_type] ?? item.resource_type}
                                  {scopeName ? ` · ${scopeName}` : ''}
                                  {' · '}
                                  {metricPhrase(item)}
                                  {item.confidence === 'low' ? ' · low confidence' : ''}
                                </div>
                              </td>
                              <td className="recs-col-rec">
                                <div className="recs-advice">{recommendationAdvice(t, item)}</div>
                              </td>
                              <td className="recs-col-cost">
                                {after != null ? (
                                  after < 0.5 ? (
                                    <>
                                      {/* Full savings (stop/terminate): after is ~$0 — lead with save amount. */}
                                      <div className="recs-cost-after">
                                        save {formatMoney(item.estimated_monthly_savings, currency)}
                                        <span className="recs-cost-suffix">/mo</span>
                                      </div>
                                      <div className="recs-cost-current">
                                        {formatMoney(item.monthly_cost, currency)}/mo now → $0 after
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="recs-cost-after">
                                        {formatMoney(after, currency)}
                                        <span className="recs-cost-suffix">/mo after</span>
                                      </div>
                                      <div className="recs-cost-current">
                                        {formatMoney(item.monthly_cost, currency)}/mo now
                                      </div>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <div className="recs-cost-risk">Performance risk</div>
                                    <div className="recs-cost-current">
                                      {formatMoney(item.monthly_cost, currency)}/mo now
                                    </div>
                                  </>
                                )}
                              </td>
                              <td className="recs-col-menu actions-cell">
                                <RowMenu
                                  item={item}
                                  busy={busy}
                                  onSilence={(days) => void silenceItem(item, days)}
                                  onUnsilence={() => void unsilienceItem(item)}
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {loading && data != null ? (
                  <p className="dashboard-cost-updating" aria-live="polite">
                    Updating…
                  </p>
                ) : null}
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
