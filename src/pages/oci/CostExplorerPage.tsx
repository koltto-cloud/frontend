import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiRequest } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { loadResourceDisplayNames, resourceDisplayLabel } from '@/oci/resourceDisplayNames'
import TimeSeriesChart from '@/components/TimeSeriesChart'
import BarChart from '@/components/BarChart'
import ResourceCostUtilPanel from '@/components/ResourceCostUtilPanel'
import { Alert } from '@/components/Alert'
import PageHeader from '@/components/PageHeader'
import { CostExplorerHelp } from '@/content/pageHelp'
import { intlLocale } from '@/i18n/languages'

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

function formatMoney(
  amount: number | null | undefined,
  currency: string | null,
  locale: string,
  emDash: string,
): string {
  if (amount == null || Number.isNaN(Number(amount))) return emDash
  const raw = (currency && currency.trim() ? currency.trim() : 'USD').toUpperCase()
  const code = raw === 'US$' || raw === 'USA' ? 'USD' : raw
  try {
    return Number(amount).toLocaleString(locale, {
      style: 'currency',
      currency: code.length === 3 ? code : 'USD',
      maximumFractionDigits: 2,
    })
  } catch {
    return `$${Number(amount).toFixed(2)}`
  }
}

export default function CostExplorerPage() {
  const { t, i18n } = useTranslation()
  const locale = intlLocale(i18n.resolvedLanguage)
  const emDash = t('common.emDash')
  const unknownLabel = t('common.unknown')

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
        label: i.service ?? unknownLabel,
        value: i.total_cost ?? 0,
        id: i.service ?? unknownLabel,
      })),
    [breakdown, unknownLabel],
  )

  const compartmentChart = useMemo(
    () =>
      (breakdown?.byCompartment.items ?? []).map((i) => {
        const name = i.compartment_name?.trim()
        const id = i.compartment_id
        const shortId = id && id.length > 18 ? `${id.slice(0, 18)}…` : id
        return {
          label: name || shortId || unknownLabel,
          value: i.total_cost ?? 0,
          id: id ?? undefined,
          title: id ?? name ?? undefined,
        }
      }),
    [breakdown, unknownLabel],
  )

  const resourceChart = useMemo(() => {
    const names = breakdown?.names ?? {}
    return (breakdown?.topResources.items ?? []).map((i) => ({
      label: i.resource_id
        ? resourceDisplayLabel(i.resource_id, names, i.service ?? unknownLabel)
        : (i.service ?? unknownLabel),
      value: i.total_cost ?? 0,
      title: i.resource_id ?? i.service ?? undefined,
      id: i.resource_id ?? undefined,
      service: i.service,
    }))
  }, [breakdown, unknownLabel])

  const filterLabel =
    trendFilter?.kind === 'service'
      ? t('costExplorer.filterService', { value: trendFilter.value })
      : trendFilter?.kind === 'compartment'
        ? t('costExplorer.filterScope', { value: trendFilter.label })
        : null

  const money = (amount: number | null | undefined) =>
    formatMoney(amount, currency, locale, emDash)

  if (!companyId || !connectionId) {
    return (
      <div className="page">
        <PageHeader
          title={t('pages.costExplorer.title')}
          helpTitle={t('pages.costExplorer.helpTitle')}
          help={<CostExplorerHelp />}
        />
        <p className="empty">
          {t('costExplorer.selectContext')}
          {companyId && !connectionId ? (
            <>
              {' '}
              <Link to="/connections">{t('costExplorer.setupConnection')}</Link>
            </>
          ) : null}
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title={t('pages.costExplorer.title')}
        lead={t('pages.costExplorer.lead')}
        helpTitle={t('pages.costExplorer.helpTitle')}
        help={<CostExplorerHelp />}
      />

      <div className="filters">
        <label>
          {t('common.startDate')}
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          {t('common.endDate')}
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>

      <Alert type="error">{breakdownError || trendError}</Alert>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">{t('costExplorer.totalCost')}</div>
          <div className="value">
            {breakdownLoading && !breakdown ? '…' : money(breakdown?.total.total_cost)}
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
          <h2 style={{ margin: 0 }}>{t('costExplorer.dailyTrend')}</h2>
          {filterLabel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="page-lead" style={{ margin: 0, fontSize: 13 }}>
                {t('costExplorer.filtered', { filter: filterLabel })}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setTrendFilter(null)}
              >
                {t('costExplorer.clearFilter')}
              </button>
            </div>
          ) : null}
        </div>
        {trendLoading && !trend ? (
          <p className="loading">{t('costExplorer.loadingTrend')}</p>
        ) : (
          <>
            {trendLoading && trend != null ? (
              <p className="dashboard-cost-updating" aria-live="polite">
                {t('common.updating')}
              </p>
            ) : null}
            <TimeSeriesChart
              points={chartPoints}
              valueLabel={t('costExplorer.cost')}
              valuePrefix="$"
              dateOnly
              height={280}
            />
          </>
        )}
      </section>

      <div className="tabs" role="tablist" aria-label={t('costExplorer.dimensionTabs')}>
        {(
          [
            ['service', 'costExplorer.tabService'],
            ['compartment', 'costExplorer.tabScope'],
            ['resources', 'costExplorer.tabTopResources'],
          ] as const
        ).map(([value, labelKey]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={dimension === value}
            className={`tab${dimension === value ? ' active' : ''}`}
            onClick={() => setDimension(value)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <section className="card">
        {breakdownLoading && !breakdown ? (
          <p className="loading">{t('costExplorer.loadingBreakdown')}</p>
        ) : dimension === 'service' ? (
          <>
            <h2>{t('costExplorer.byService')}</h2>
            <p className="page-lead" style={{ marginTop: 0 }}>
              {t('costExplorer.byServiceHint')}
            </p>
            <BarChart
              items={serviceChart}
              formatValue={(v) => money(v)}
              onItemClick={(item) => {
                if (!item.id) return
                setTrendFilter({ kind: 'service', value: item.id })
              }}
            />
          </>
        ) : dimension === 'compartment' ? (
          <>
            <h2>{t('costExplorer.byScope')}</h2>
            <p className="page-lead" style={{ marginTop: 0 }}>
              {t('costExplorer.byScopeHint')}
            </p>
            <BarChart
              items={compartmentChart}
              formatValue={(v) => money(v)}
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
            <h2>{t('costExplorer.topResources')}</h2>
            <p className="page-lead" style={{ marginTop: 0 }}>
              {t('costExplorer.topResourcesHint')}
            </p>
            <BarChart
              items={resourceChart}
              formatValue={(v) => money(v)}
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
