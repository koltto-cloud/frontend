import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
import PageHeader from '@/components/PageHeader'
import { BudgetsHelp } from '@/content/pageHelp'
import { intlLocale } from '@/i18n/languages'

interface CostBudget {
  budget_id: string
  name: string
  amount: number
  currency: string
  period: string
  scope_type: string
  scope_value: string | null
  alert_threshold_pct: number
  template_id: string | null
}

interface BudgetTemplate {
  template_id: string
  name: string
  description: string
  period: string
  scope_type: string
  alert_threshold_pct: number
  suggested_amount: number | null
}

interface AlertPreference {
  preference_id: string
  event_type: string
  enabled: boolean
  emails: string | null
  min_delta: number | null
  min_pct_change: number | null
  template_id: string | null
}

interface AlertTemplate {
  template_id: string
  name: string
  description: string
  event_type: string
  min_pct_change: number | null
  min_delta: number | null
}

interface AlertEvaluateResult {
  emails_sent: number
  anomalies_flagged: number
  recommendations_flagged: number
  budgets_flagged: number
  skipped: string[]
}

const EMPTY_BUDGET = {
  name: '',
  amount: '',
  period: 'monthly',
  scope_type: 'tenancy',
  scope_value: '',
  alert_threshold_pct: '80',
}

function formatMoney(amount: number, currency: string, locale: string): string {
  const code = (currency || 'USD').toUpperCase()
  try {
    return amount.toLocaleString(locale, {
      style: 'currency',
      currency: code.length === 3 ? code : 'USD',
      maximumFractionDigits: 0,
    })
  } catch {
    return `$${amount.toFixed(0)}`
  }
}

export default function BudgetsPage() {
  const { t, i18n } = useTranslation()
  const { activeCompany, connection } = useAuth()
  const locale = intlLocale(i18n.resolvedLanguage)
  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id

  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [form, setForm] = useState(EMPTY_BUDGET)
  const [busy, setBusy] = useState(false)

  const budgetsBase =
    companyId && connectionId
      ? `/api/v1/cloud/oci/budgets/${companyId}/connections/${connectionId}/budgets`
      : null
  const alertsBase =
    companyId && connectionId
      ? `/api/v1/cloud/oci/alerts/${companyId}/connections/${connectionId}/alerts`
      : null

  const {
    data: budgets,
    error: budgetsError,
    loading: budgetsLoading,
    reload: reloadBudgets,
  } = useAsyncData(
    () => (budgetsBase ? apiRequest<CostBudget[]>(budgetsBase) : Promise.resolve([])),
    [budgetsBase],
  )

  const { data: budgetTemplates } = useAsyncData(
    () => apiRequest<BudgetTemplate[]>('/api/v1/cloud/oci/budgets/templates'),
    ['budget-templates'],
  )

  const {
    data: alerts,
    error: alertsError,
    loading: alertsLoading,
    reload: reloadAlerts,
  } = useAsyncData(
    () => (alertsBase ? apiRequest<AlertPreference[]>(alertsBase) : Promise.resolve([])),
    [alertsBase],
  )

  const { data: alertTemplates } = useAsyncData(
    () => apiRequest<AlertTemplate[]>('/api/v1/cloud/oci/alerts/templates'),
    ['alert-templates'],
  )

  const createBudget = async (body: Record<string, unknown>) => {
    if (!budgetsBase) return
    setErr('')
    setMsg('')
    setBusy(true)
    try {
      await apiRequest(budgetsBase, { method: 'POST', body })
      setMsg(t('budgets.created'))
      setForm(EMPTY_BUDGET)
      void reloadBudgets()
    } catch (e) {
      setErr(formatApiError(e))
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      setErr(t('budgets.validation'))
      return
    }
    await createBudget({
      name: form.name.trim(),
      amount,
      period: form.period,
      scope_type: form.scope_type,
      scope_value: form.scope_value.trim() || null,
      alert_threshold_pct: Number(form.alert_threshold_pct) || 80,
    })
  }

  const createFromTemplate = async (tmpl: BudgetTemplate) => {
    const amount = tmpl.suggested_amount ?? 1000
    await createBudget({
      name: tmpl.name,
      amount,
      period: tmpl.period,
      scope_type: tmpl.scope_type,
      scope_value: tmpl.scope_type === 'service' ? 'Compute' : null,
      alert_threshold_pct: tmpl.alert_threshold_pct,
      template_id: tmpl.template_id,
    })
  }

  const deleteBudget = async (budgetId: string) => {
    if (!budgetsBase) return
    if (!window.confirm(t('budgets.confirmDelete'))) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`${budgetsBase}/${budgetId}`, { method: 'DELETE' })
      setMsg(t('budgets.deleted'))
      void reloadBudgets()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const createAlertFromTemplate = async (tmpl: AlertTemplate) => {
    if (!alertsBase) return
    setErr('')
    setMsg('')
    setBusy(true)
    try {
      await apiRequest(alertsBase, {
        method: 'POST',
        body: {
          event_type: tmpl.event_type,
          enabled: true,
          min_delta: tmpl.min_delta,
          min_pct_change: tmpl.min_pct_change,
          template_id: tmpl.template_id,
        },
      })
      setMsg(t('budgets.alertCreated', { name: tmpl.name }))
      void reloadAlerts()
    } catch (e) {
      setErr(formatApiError(e))
    } finally {
      setBusy(false)
    }
  }

  const toggleAlert = async (pref: AlertPreference) => {
    if (!alertsBase) return
    setErr('')
    try {
      await apiRequest(`${alertsBase}/${pref.preference_id}`, {
        method: 'PATCH',
        body: { enabled: !pref.enabled },
      })
      void reloadAlerts()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const deleteAlert = async (preferenceId: string) => {
    if (!alertsBase) return
    if (!window.confirm(t('budgets.confirmDeleteAlert'))) return
    setErr('')
    try {
      await apiRequest(`${alertsBase}/${preferenceId}`, { method: 'DELETE' })
      setMsg(t('budgets.alertDeleted'))
      void reloadAlerts()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const evaluateNow = async () => {
    if (!alertsBase) return
    setErr('')
    setMsg('')
    setBusy(true)
    try {
      const result = await apiRequest<AlertEvaluateResult>(`${alertsBase}/evaluate`, {
        method: 'POST',
      })
      setMsg(
        t('budgets.evaluationComplete', {
          emails_sent: result.emails_sent,
          anomalies_flagged: result.anomalies_flagged,
          recommendations_flagged: result.recommendations_flagged,
          budgets_flagged: result.budgets_flagged,
        }),
      )
    } catch (e) {
      setErr(formatApiError(e))
    } finally {
      setBusy(false)
    }
  }

  if (!companyId || !connectionId) {
    return (
      <div className="page">
        <PageHeader
          title={t('pages.budgets.title')}
          helpTitle={t('pages.budgets.helpTitle')}
          help={<BudgetsHelp />}
        />
        <p className="empty">
          {t('budgets.selectContext')}
          {companyId && !connectionId ? (
            <>
              {' '}
              <Link to="/connections">{t('budgets.setupConnection')}</Link>
            </>
          ) : null}
        </p>
      </div>
    )
  }

  const budgetRows = budgets ?? []
  const alertRows = alerts ?? []

  return (
    <div className="page">
      <PageHeader
        title={t('pages.budgets.title')}
        lead={t('pages.budgets.lead')}
        helpTitle={t('pages.budgets.helpTitle')}
        help={<BudgetsHelp />}
      />

      <Alert type="error">{err || budgetsError || alertsError}</Alert>
      <Alert type="success">{msg}</Alert>

      <h2>{t('budgets.budgets')}</h2>
      {(budgetTemplates ?? []).length > 0 ? (
        <div className="filters" style={{ marginBottom: 12 }}>
          {(budgetTemplates ?? []).map((tmpl) => (
            <button
              key={tmpl.template_id}
              type="button"
              className="btn btn-sm"
              disabled={busy}
              title={tmpl.description}
              onClick={() => void createFromTemplate(tmpl)}
            >
              {t('budgets.useTemplate', { name: tmpl.name })}
            </button>
          ))}
        </div>
      ) : null}

      {budgetsLoading && !budgets ? (
        <p className="loading">{t('budgets.loading')}</p>
      ) : budgetRows.length === 0 ? (
        <p className="empty">{t('budgets.empty')}</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('budgets.name')}</th>
                <th>{t('budgets.amount')}</th>
                <th>{t('budgets.period')}</th>
                <th>{t('budgets.scope')}</th>
                <th>{t('budgets.alertPercent')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {budgetRows.map((b) => (
                <tr key={b.budget_id}>
                  <td>{b.name}</td>
                  <td>{formatMoney(b.amount, b.currency, locale)}</td>
                  <td>{t(`budgets.${b.period}`, { defaultValue: b.period })}</td>
                  <td>
                    {t(`budgets.scopeTypes.${b.scope_type}`, { defaultValue: b.scope_type })}
                    {b.scope_value ? ` · ${b.scope_value}` : ''}
                  </td>
                  <td>{b.alert_threshold_pct}%</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void deleteBudget(b.budget_id)}
                    >
                      {t('budgets.deleteBudget')}
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
          {t('budgets.name')}
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </label>
        <label>
          {t('budgets.amount')}
          <input
            type="number"
            min="1"
            step="1"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
        </label>
        <label>
          {t('budgets.period')}
          <select
            value={form.period}
            onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
          >
            <option value="monthly">{t('budgets.monthly')}</option>
            <option value="quarterly">{t('budgets.quarterly')}</option>
            <option value="annual">{t('budgets.annual')}</option>
          </select>
        </label>
        <label>
          {t('budgets.scope')}
          <select
            value={form.scope_type}
            onChange={(e) => setForm((f) => ({ ...f, scope_type: e.target.value }))}
          >
            <option value="tenancy">{t('budgets.scopeTypes.tenancy')}</option>
            <option value="service">{t('budgets.scopeTypes.service')}</option>
            <option value="compartment">{t('budgets.scopeTypes.compartment')}</option>
          </select>
        </label>
        {form.scope_type !== 'tenancy' ? (
          <label>
            {t('budgets.scopeValue')}
            <input
              value={form.scope_value}
              placeholder={
                form.scope_type === 'service'
                  ? t('budgets.servicePlaceholder')
                  : t('budgets.compartmentPlaceholder')
              }
              onChange={(e) => setForm((f) => ({ ...f, scope_value: e.target.value }))}
            />
          </label>
        ) : null}
        <label>
          {t('budgets.alertThreshold')}
          <input
            type="number"
            min="1"
            max="200"
            value={form.alert_threshold_pct}
            onChange={(e) => setForm((f) => ({ ...f, alert_threshold_pct: e.target.value }))}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t('budgets.createBudget')}
        </button>
      </form>

      <hr style={{ margin: '2rem 0', border: 0, borderTop: '1px solid var(--line)' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ margin: 0 }}>{t('budgets.alertPreferences')}</h2>
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={() => void evaluateNow()}
        >
          {t('budgets.evaluateNow')}
        </button>
      </div>
      <p className="page-lead">{t('budgets.alertHint')}</p>

      {(alertTemplates ?? []).length > 0 ? (
        <div className="filters" style={{ marginBottom: 12 }}>
          {(alertTemplates ?? []).map((tmpl) => (
            <button
              key={tmpl.template_id}
              type="button"
              className="btn btn-sm"
              disabled={busy}
              title={tmpl.description}
              onClick={() => void createAlertFromTemplate(tmpl)}
            >
              {t('budgets.addTemplate', { name: tmpl.name })}
            </button>
          ))}
        </div>
      ) : null}

      {alertsLoading && !alerts ? (
        <p className="loading">{t('budgets.loadingAlerts')}</p>
      ) : alertRows.length === 0 ? (
        <p className="empty">{t('budgets.noAlerts')}</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('budgets.event')}</th>
                <th>{t('budgets.status')}</th>
                <th>{t('budgets.thresholds')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {alertRows.map((a) => (
                <tr key={a.preference_id}>
                  <td>{a.event_type}</td>
                  <td>{a.enabled ? t('budgets.enabled') : t('budgets.disabled')}</td>
                  <td>
                    {[
                      a.min_pct_change != null ? `${a.min_pct_change}%` : null,
                      a.min_delta != null ? `Δ ${a.min_delta}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => void toggleAlert(a)}
                    >
                      {a.enabled ? t('budgets.disable') : t('budgets.enable')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void deleteAlert(a.preference_id)}
                    >
                      {t('budgets.deleteAlert')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
