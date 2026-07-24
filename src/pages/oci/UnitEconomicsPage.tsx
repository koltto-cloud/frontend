import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
import PageHeader from '@/components/PageHeader'
import { UnitEconomicsHelp } from '@/content/pageHelp'
import { intlLocale } from '@/i18n/languages'

interface BusinessMetric {
  metric_id: string
  name: string
  unit_label: string
  value: number
  period: string
  notes: string | null
}

interface UnitEconomicsItem {
  metric_id: string
  name: string
  unit_label: string
  metric_value: number
  period_cost: number
  cost_per_unit: number | null
  currency: string | null
}

interface UnitEconomicsResponse {
  currency: string | null
  period_cost: number
  items: UnitEconomicsItem[]
}

const EMPTY_FORM = {
  name: '',
  unit_label: '',
  value: '',
  period: 'monthly',
}

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
): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  const raw = (currency && currency.trim() ? currency.trim() : 'USD').toUpperCase()
  const code = raw === 'US$' || raw === 'USA' ? 'USD' : raw
  try {
    return Number(amount).toLocaleString(locale, {
      style: 'currency',
      currency: code.length === 3 ? code : 'USD',
      maximumFractionDigits: 4,
    })
  } catch {
    return `$${Number(amount).toFixed(4)}`
  }
}

export default function UnitEconomicsPage() {
  const { t, i18n } = useTranslation()
  const { activeCompany, connection } = useAuth()
  const locale = intlLocale(i18n.resolvedLanguage)
  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id
  const defaults = defaultDateRange()

  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [form, setForm] = useState(EMPTY_FORM)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const base =
    companyId && connectionId
      ? `/api/v1/cloud/oci/unit-economics/${companyId}/connections/${connectionId}`
      : null

  const {
    data: metrics,
    error: metricsError,
    loading: metricsLoading,
    reload: reloadMetrics,
  } = useAsyncData(
    () =>
      base
        ? apiRequest<BusinessMetric[]>(`${base}/unit-economics/metrics`)
        : Promise.resolve([]),
    [base],
  )

  const {
    data: computed,
    error: computedError,
    loading: computedLoading,
    reload: reloadComputed,
  } = useAsyncData(
    () => {
      if (!base) return Promise.resolve(null)
      return apiRequest<UnitEconomicsResponse>(`${base}/unit-economics`, {
        query: { start_date: startDate, end_date: endDate },
      })
    },
    [base ? `${base}:${startDate}:${endDate}` : null],
    { keepPreviousData: true },
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!base) return
    const value = Number(form.value)
    if (!form.name.trim() || !form.unit_label.trim() || !Number.isFinite(value) || value <= 0) {
      setErr(t('unitEconomics.validation'))
      return
    }
    setErr('')
    setMsg('')
    setBusy(true)
    try {
      await apiRequest(`${base}/unit-economics/metrics`, {
        method: 'POST',
        body: {
          name: form.name.trim(),
          unit_label: form.unit_label.trim(),
          value,
          period: form.period,
        },
      })
      setMsg(t('unitEconomics.created'))
      setForm(EMPTY_FORM)
      void reloadMetrics()
      void reloadComputed()
    } catch (e2) {
      setErr(formatApiError(e2))
    } finally {
      setBusy(false)
    }
  }

  const deleteMetric = async (metricId: string) => {
    if (!base) return
    if (!window.confirm(t('unitEconomics.confirmDelete'))) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`${base}/unit-economics/metrics/${metricId}`, { method: 'DELETE' })
      setMsg(t('unitEconomics.deleted'))
      void reloadMetrics()
      void reloadComputed()
    } catch (e2) {
      setErr(formatApiError(e2))
    }
  }

  if (!companyId || !connectionId) {
    return (
      <div className="page">
        <PageHeader
          title={t('pages.unitEconomics.title')}
          helpTitle={t('pages.unitEconomics.helpTitle')}
          help={<UnitEconomicsHelp />}
        />
        <p className="empty">
          {t('unitEconomics.selectContext')}
          {companyId && !connectionId ? (
            <>
              {' '}
              <Link to="/connections">{t('unitEconomics.setupConnection')}</Link>
            </>
          ) : null}
        </p>
      </div>
    )
  }

  const metricRows = metrics ?? []
  const currency = computed?.currency ?? 'USD'

  return (
    <div className="page">
      <PageHeader
        title={t('pages.unitEconomics.title')}
        lead={t('pages.unitEconomics.lead')}
        helpTitle={t('pages.unitEconomics.helpTitle')}
        help={<UnitEconomicsHelp />}
      />

      <Alert type="error">{err || metricsError || computedError}</Alert>
      <Alert type="success">{msg}</Alert>

      <div className="filters">
        <label>
          {t('unitEconomics.startDate')}
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          {t('unitEconomics.endDate')}
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>

      <h2>{t('unitEconomics.cloudCostEach')}</h2>
      <p className="page-lead" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
        {t('unitEconomics.fullBillHint')}
      </p>
      {computedLoading && !computed ? (
        <p className="loading">{t('unitEconomics.computing')}</p>
      ) : !computed || computed.items.length === 0 ? (
        <p className="empty">
          {t('unitEconomics.empty')}
          {computed
            ? ` ${t('unitEconomics.billForRange', {
                amount: formatMoney(computed.period_cost, currency, locale),
              })}.`
            : ''}
        </p>
      ) : (
        <>
          <p className="page-lead" style={{ marginTop: 0 }}>
            {t('unitEconomics.billForRange', {
              amount: formatMoney(computed.period_cost, currency, locale),
            })}
          </p>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('unitEconomics.columns.whatYouCount')}</th>
                  <th>{t('unitEconomics.columns.howMany')}</th>
                  <th>{t('unitEconomics.columns.costEach')}</th>
                </tr>
              </thead>
              <tbody>
                {computed.items.map((item) => (
                  <tr key={item.metric_id}>
                    <td>
                      {item.name}
                      <span className="page-lead" style={{ marginLeft: 6, fontSize: 12 }}>
                        ({t('unitEconomics.perUnit', { unit: item.unit_label })})
                      </span>
                    </td>
                    <td>{item.metric_value.toLocaleString(locale)}</td>
                    <td>{formatMoney(item.cost_per_unit, item.currency ?? currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={{ marginTop: '1.75rem' }}>{t('unitEconomics.businessCounts')}</h2>
      <p className="page-lead" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
        {t('unitEconomics.businessCountsHint')}
      </p>
      {metricsLoading && !metrics ? (
        <p className="loading">{t('unitEconomics.loading')}</p>
      ) : metricRows.length === 0 ? (
        <p className="empty">{t('unitEconomics.noBusinessCounts')}</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('unitEconomics.form.name')}</th>
                <th>{t('unitEconomics.form.countedAs')}</th>
                <th>{t('unitEconomics.form.howMany')}</th>
                <th>{t('unitEconomics.form.period')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {metricRows.map((m) => (
                <tr key={m.metric_id}>
                  <td>{m.name}</td>
                  <td>{m.unit_label}</td>
                  <td>{m.value.toLocaleString(locale)}</td>
                  <td>{t(`unitEconomics.form.${m.period}`, { defaultValue: m.period })}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void deleteMetric(m.metric_id)}
                    >
                      {t('unitEconomics.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="filters" onSubmit={(e) => void handleCreate(e)} style={{ marginTop: 16 }}>
        <label>
          {t('unitEconomics.form.name')}
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('unitEconomics.form.namePlaceholder')}
            required
          />
        </label>
        <label>
          {t('unitEconomics.form.countedAs')}
          <input
            value={form.unit_label}
            onChange={(e) => setForm((f) => ({ ...f, unit_label: e.target.value }))}
            placeholder={t('unitEconomics.form.unitPlaceholder')}
            required
          />
        </label>
        <label>
          {t('unitEconomics.form.howMany')}
          <input
            type="number"
            min="0.0001"
            step="any"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            placeholder={t('unitEconomics.form.valuePlaceholder')}
            required
          />
        </label>
        <label>
          {t('unitEconomics.form.period')}
          <select
            value={form.period}
            onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
          >
            <option value="monthly">{t('unitEconomics.form.monthly')}</option>
            <option value="quarterly">{t('unitEconomics.form.quarterly')}</option>
            <option value="annual">{t('unitEconomics.form.annual')}</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t('unitEconomics.form.addCount')}
        </button>
      </form>
    </div>
  )
}
