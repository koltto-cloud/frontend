import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiRequest } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
import PageHeader from '@/components/PageHeader'
import { AnomaliesHelp } from '@/content/pageHelp'
import { intlLocale } from '@/i18n/languages'

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
  start_date: string
  end_date: string
  currency: string | null
  items: SpendAnomaly[]
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
  const code = raw === 'US$' || raw === 'USA' ? 'USD' : raw
  try {
    return Number(amount).toLocaleString(locale, {
      style: 'currency',
      currency: code.length === 3 ? code : 'USD',
      maximumFractionDigits: 0,
    })
  } catch {
    return `$${Number(amount).toFixed(0)}`
  }
}

function formatDay(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AnomaliesPage() {
  const { t, i18n } = useTranslation()
  const { activeCompany, connection } = useAuth()
  const locale = intlLocale(i18n.resolvedLanguage)
  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id

  const [startDate] = useState(isoDaysAgo(30))
  const [endDate] = useState(isoDaysAgo(0))

  const url =
    companyId && connectionId
      ? `/api/v1/cloud/oci/usage/${companyId}/connections/${connectionId}/usage/anomalies`
      : null

  const { data, error, loading } = useAsyncData(
    () => {
      if (!url) return Promise.resolve(null)
      return apiRequest<SpendAnomaliesResponse>(url, {
        query: { start_date: startDate, end_date: endDate, limit: 20 },
      })
    },
    [url ? `${url}:${startDate}:${endDate}` : null],
    { keepPreviousData: true },
  )

  const currency = data?.currency ?? 'USD'
  const items = useMemo(() => data?.items ?? [], [data])
  const hasCompany = Boolean(companyId)
  const hasConnection = Boolean(connectionId)

  return (
    <div className="page">
      <PageHeader
        title={t('pages.anomalies.title')}
        lead={t('pages.anomalies.lead')}
        helpTitle={t('pages.anomalies.helpTitle')}
        help={<AnomaliesHelp />}
      />

      {!hasCompany || !hasConnection ? (
        <p className="empty">
          {t('anomalies.selectContext')}
          {!hasConnection && hasCompany && (
            <>
              {' '}
              <Link to="/connections">{t('anomalies.setupConnection')}</Link>
            </>
          )}
        </p>
      ) : (
        <>
          <Alert type="error">{error}</Alert>

          {loading && !data ? (
            <p className="loading">{t('anomalies.loading')}</p>
          ) : items.length === 0 ? (
            <p className="empty">{t('anomalies.empty')}</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
              {items.map((a) => (
                <li key={a.date} className="card" style={{ padding: '10px 14px' }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 14 }}>{formatDay(a.date, locale)}</strong>
                      <span className="page-lead" style={{ fontSize: 12, marginLeft: 8 }}>
                        {a.driver_service
                          ? t('anomalies.drivenBy', { service: a.driver_service })
                          : t('anomalies.mixedDrivers')}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700, color: '#e5484d' }}>
                        +{formatMoney(a.delta, currency, locale)}
                      </span>
                      <span className="page-lead" style={{ fontSize: 12, marginLeft: 8 }}>
                        +{a.pct_change.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="page-lead" style={{ fontSize: 13, marginTop: 4 }}>
                    {formatMoney(a.total_cost, currency, locale)} {t('anomalies.vs')}{' '}
                    {formatMoney(a.baseline_avg, currency, locale)} {t('anomalies.typical')}
                    {a.driver_service
                      ? ` · ${t('anomalies.up', {
                          service: a.driver_service,
                          amount: formatMoney(a.driver_delta, currency, locale),
                        })}`
                      : ''}
                    {' · '}
                    <Link to="/">{t('anomalies.viewTrend')}</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
