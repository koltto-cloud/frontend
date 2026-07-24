import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
import PageHeader from '@/components/PageHeader'
import { budgetsHelp } from '@/content/pageHelp'

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

function formatMoney(amount: number, currency: string): string {
  const code = (currency || 'USD').toUpperCase()
  try {
    return amount.toLocaleString(undefined, {
      style: 'currency',
      currency: code.length === 3 ? code : 'USD',
      maximumFractionDigits: 0,
    })
  } catch {
    return `$${amount.toFixed(0)}`
  }
}

export default function BudgetsPage() {
  const { t } = useTranslation()
  const { activeCompany, connection } = useAuth()
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
      setMsg('Budget created.')
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
      setErr('Name and a positive amount are required.')
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
    if (!window.confirm('Delete this budget?')) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`${budgetsBase}/${budgetId}`, { method: 'DELETE' })
      setMsg('Budget deleted.')
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
      setMsg(`Alert preference “${tmpl.name}” created.`)
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
    if (!window.confirm('Delete this alert preference?')) return
    setErr('')
    try {
      await apiRequest(`${alertsBase}/${preferenceId}`, { method: 'DELETE' })
      setMsg('Alert preference deleted.')
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
        `Evaluation complete — ${result.emails_sent} email(s) sent` +
          ` (anomalies ${result.anomalies_flagged}, recommendations ${result.recommendations_flagged}, budgets ${result.budgets_flagged}).`,
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
          help={budgetsHelp}
        />
        <p className="empty">
          Select a company and cloud connection in the top bar.
          {companyId && !connectionId ? (
            <>
              {' '}
              <Link to="/connections">Set up a connection</Link>
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
        help={budgetsHelp}
      />

      <Alert type="error">{err || budgetsError || alertsError}</Alert>
      <Alert type="success">{msg}</Alert>

      <h2>Budgets</h2>
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
              Use: {tmpl.name}
            </button>
          ))}
        </div>
      ) : null}

      {budgetsLoading && !budgets ? (
        <p className="loading">Loading budgets…</p>
      ) : budgetRows.length === 0 ? (
        <p className="empty">No budgets yet. Create one below or use a template.</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Amount</th>
                <th>Period</th>
                <th>Scope</th>
                <th>Alert %</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {budgetRows.map((b) => (
                <tr key={b.budget_id}>
                  <td>{b.name}</td>
                  <td>{formatMoney(b.amount, b.currency)}</td>
                  <td>{b.period}</td>
                  <td>
                    {b.scope_type}
                    {b.scope_value ? ` · ${b.scope_value}` : ''}
                  </td>
                  <td>{b.alert_threshold_pct}%</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void deleteBudget(b.budget_id)}
                    >
                      Delete
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
          Name
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </label>
        <label>
          Amount
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
          Period
          <select
            value={form.period}
            onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </label>
        <label>
          Scope
          <select
            value={form.scope_type}
            onChange={(e) => setForm((f) => ({ ...f, scope_type: e.target.value }))}
          >
            <option value="tenancy">Tenancy</option>
            <option value="service">Service</option>
            <option value="compartment">Compartment</option>
          </select>
        </label>
        {form.scope_type !== 'tenancy' ? (
          <label>
            Scope value
            <input
              value={form.scope_value}
              placeholder={form.scope_type === 'service' ? 'e.g. Compute' : 'compartment OCID'}
              onChange={(e) => setForm((f) => ({ ...f, scope_value: e.target.value }))}
            />
          </label>
        ) : null}
        <label>
          Alert threshold %
          <input
            type="number"
            min="1"
            max="200"
            value={form.alert_threshold_pct}
            onChange={(e) => setForm((f) => ({ ...f, alert_threshold_pct: e.target.value }))}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Create budget
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
        <h2 style={{ margin: 0 }}>Alert preferences</h2>
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={() => void evaluateNow()}
        >
          Send test / evaluate now
        </button>
      </div>
      <p className="page-lead">Email when anomalies, recommendations, or budget thresholds fire.</p>

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
              Add: {tmpl.name}
            </button>
          ))}
        </div>
      ) : null}

      {alertsLoading && !alerts ? (
        <p className="loading">Loading alerts…</p>
      ) : alertRows.length === 0 ? (
        <p className="empty">No alert preferences yet. Add one from a template above.</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Status</th>
                <th>Thresholds</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {alertRows.map((a) => (
                <tr key={a.preference_id}>
                  <td>{a.event_type}</td>
                  <td>{a.enabled ? 'Enabled' : 'Disabled'}</td>
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
                      {a.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void deleteAlert(a.preference_id)}
                    >
                      Delete
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
