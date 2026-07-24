import { useEffect, useMemo, useRef, useState } from 'react'
import type { TFunction } from 'i18next'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useOciCompartments } from '@/hooks/useOciCompartments'
import { intlLocale } from '@/i18n/languages'
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

const KIND_META: Record<RecKind, { labelKey: string; tone: string }> = {
  idle: { labelKey: 'recommendations.actions.stop', tone: 'danger' },
  idle_storage: { labelKey: 'recommendations.actions.review', tone: 'warning' },
  idle_lb: { labelKey: 'recommendations.actions.terminate', tone: 'danger' },
  unattached_volume: { labelKey: 'recommendations.actions.terminate', tone: 'danger' },
  oversized: { labelKey: 'recommendations.actions.downsize', tone: 'warning' },
  overutilized: { labelKey: 'recommendations.actions.scaleUp', tone: 'accent' },
}

const ACTION_FILTERS: { value: RecAction; labelKey: string }[] = [
  { value: 'terminate', labelKey: 'recommendations.actions.terminate' },
  { value: 'downsize', labelKey: 'recommendations.actions.downsize' },
  { value: 'review', labelKey: 'recommendations.actions.review' },
  { value: 'stop', labelKey: 'recommendations.actions.stop' },
  { value: 'scale_up', labelKey: 'recommendations.actions.scaleUp' },
]

const TYPE_FILTERS: { value: string; labelKey: string }[] = [
  { value: '', labelKey: 'recommendations.allTypes' },
  { value: 'compute', labelKey: 'recommendations.types.compute' },
  { value: 'block_storage', labelKey: 'recommendations.types.block_storage' },
  { value: 'file_storage', labelKey: 'recommendations.types.file_storage' },
  { value: 'load_balancer', labelKey: 'recommendations.types.load_balancer' },
]

const TYPE_LABEL: Record<string, string> = {
  compute: 'recommendations.types.compute',
  block_storage: 'recommendations.types.block_storage',
  file_storage: 'recommendations.types.file_storage',
  load_balancer: 'recommendations.types.load_balancer',
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function formatMoney(
  amount: number | null | undefined,
  currency: string | null,
  locale: string,
): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  const raw = (currency && currency.trim() ? currency.trim() : 'USD').toUpperCase()
  const code = raw === 'US$' || raw === 'USA' || raw === '$' ? 'USD' : raw
  const value = Number(amount)
  const digits = Math.abs(value) > 0 && Math.abs(value) < 10 ? 2 : 0
  try {
    return value.toLocaleString(locale, {
      style: 'currency',
      currency: code.length === 3 ? code : 'USD',
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    })
  } catch {
    return value.toLocaleString(locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    })
  }
}

function pct(value: number | null, t: TFunction): string {
  return value == null || Number.isNaN(value)
    ? t('recommendations.metrics.na')
    : `${value.toFixed(0)}%`
}

function metricPhrase(item: RecommendationItem, t: TFunction): string {
  if (item.kind === 'unattached_volume') return t('recommendations.metrics.unattached')
  if (item.resource_type === 'load_balancer') return t('recommendations.metrics.noTraffic')
  if (item.resource_type === 'block_storage' || item.resource_type === 'file_storage') {
    return t('recommendations.metrics.nearZeroIo')
  }
  return t('recommendations.metrics.cpuMem', {
    cpu: pct(item.cpu_avg, t),
    mem: pct(item.mem_avg, t),
  })
}

function actionLabel(item: RecommendationItem, t: TFunction): string {
  const labelKey = KIND_META[item.kind]?.labelKey
  return labelKey ? t(labelKey) : item.action
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
  const { t } = useTranslation()
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
              {t('recommendations.unsilence')}
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
                {t('recommendations.silence30d')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onSilence(null)
                }}
              >
                {t('recommendations.ignore')}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function RecommendationsPage() {
  const { t, i18n } = useTranslation()
  const { activeCompany, connection } = useAuth()
  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id
  const locale = intlLocale(i18n.resolvedLanguage ?? i18n.language)
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
      setActionError(formatApiError(err) || t('recommendations.silenceFailed'))
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
      setActionError(formatApiError(err) || t('recommendations.unsilenceFailed'))
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
          {t('recommendations.selectContext')}
          {!hasConnection && hasCompany && (
            <>
              {' '}
              <Link to="/connections">{t('recommendations.setupConnection')}</Link>
            </>
          )}
        </p>
      ) : (
        <>
          <Alert type="error">{error || actionError}</Alert>

          {loading && !data ? (
            <p className="loading">{t('recommendations.loading')}</p>
          ) : (
            <>
              <section
                className="recs-stat-grid"
                aria-label={t('recommendations.filtersAria')}
              >
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
                        locale,
                      )}
                    </div>
                    <div className="recs-stat-label">
                      {t('recommendations.potentialSavings')}
                    </div>
                  </div>
                  <span className="recs-stat-hint">{t('recommendations.allActions')}</span>
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
                        <div className="recs-stat-label">{t(f.labelKey)}</div>
                      </div>
                    </button>
                  )
                })}
              </section>

              <section className="recs-panel">
                <div className="recs-panel-toolbar">
                  <div
                    className="tabs recs-status-tabs"
                    role="tablist"
                    aria-label={t('recommendations.statusAria')}
                  >
                    {(
                      [
                        ['active', 'recommendations.status.active'],
                        ['silenced', 'recommendations.status.silenced'],
                        ['all', 'recommendations.status.all'],
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
                        {t(label)}
                      </button>
                    ))}
                  </div>

                  <div className="recs-panel-filters">
                    <label>
                      {t('recommendations.type')}
                      <select
                        value={resourceType}
                        onChange={(e) => setResourceType(e.target.value)}
                      >
                        {TYPE_FILTERS.map((o) => (
                          <option key={o.value || 'all'} value={o.value}>
                            {t(o.labelKey)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t('recommendations.scope')}
                      <select
                        value={compartmentId}
                        onChange={(e) => setCompartmentId(e.target.value)}
                      >
                        <option value="">{t('recommendations.allScopes')}</option>
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
                    {t('recommendations.empty')}
                  </p>
                ) : (
                  <div className="data-table-wrap recs-table-wrap">
                    <table className="data-table recs-table">
                      <thead>
                        <tr>
                          <th className="recs-col-action">
                            {t('recommendations.columns.action')}
                          </th>
                          <th className="recs-col-resource">
                            {t('recommendations.columns.resource')}
                          </th>
                          <th className="recs-col-rec">
                            {t('recommendations.columns.recommendation')}
                          </th>
                          <th className="recs-col-cost">
                            {t('recommendations.columns.cost')}
                          </th>
                          <th className="recs-col-menu">
                            <span className="sr-only">{t('recommendations.rowActions')}</span>
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
                                  {actionLabel(item, t)}
                                </span>
                              </td>
                              <td className="recs-col-resource">
                                <div
                                  className="recs-resource-name"
                                  title={item.resource_id ?? undefined}
                                >
                                  {item.resource_name ?? item.resource_id ?? t('common.unknown')}
                                </div>
                                <div className="recs-resource-meta">
                                  {TYPE_LABEL[item.resource_type]
                                    ? t(TYPE_LABEL[item.resource_type])
                                    : item.resource_type}
                                  {scopeName ? ` · ${scopeName}` : ''}
                                  {' · '}
                                  {metricPhrase(item, t)}
                                  {item.confidence === 'low'
                                    ? ` · ${t('recommendations.metrics.lowConfidence')}`
                                    : ''}
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
                                        {t('recommendations.saveMo', {
                                          amount: formatMoney(
                                            item.estimated_monthly_savings,
                                            currency,
                                            locale,
                                          ),
                                        })}
                                        <span className="recs-cost-suffix">
                                          {t('recommendations.perMo')}
                                        </span>
                                      </div>
                                      <div className="recs-cost-current">
                                        {t('recommendations.nowToZero', {
                                          amount: formatMoney(item.monthly_cost, currency, locale),
                                        })}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="recs-cost-after">
                                        {formatMoney(after, currency, locale)}
                                        <span className="recs-cost-suffix">
                                          {t('recommendations.perMoAfter')}
                                        </span>
                                      </div>
                                      <div className="recs-cost-current">
                                        {t('recommendations.perMoNow', {
                                          amount: formatMoney(item.monthly_cost, currency, locale),
                                        })}
                                      </div>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <div className="recs-cost-risk">
                                      {t('recommendations.performanceRisk')}
                                    </div>
                                    <div className="recs-cost-current">
                                      {t('recommendations.perMoNow', {
                                        amount: formatMoney(item.monthly_cost, currency, locale),
                                      })}
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
                    {t('common.updating')}
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
