import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
import Modal from '@/components/Modal'

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

function formatMoney(amount: number | null | undefined, currency: string | null): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  const raw = (currency && currency.trim() ? currency.trim() : 'USD').toUpperCase()
  const code = raw === 'US$' || raw === 'USA' ? 'USD' : raw
  try {
    return Number(amount).toLocaleString(undefined, {
      style: 'currency',
      currency: code.length === 3 ? code : 'USD',
      maximumFractionDigits: 4,
    })
  } catch {
    return `$${Number(amount).toFixed(4)}`
  }
}

export default function UnitEconomicsPage() {
  const { activeCompany, connection } = useAuth()
  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id
  const defaults = defaultDateRange()

  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [form, setForm] = useState(EMPTY_FORM)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

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
      setErr('Name, unit label, and a positive value are required.')
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
      setMsg('Metric created.')
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
    if (!window.confirm('Delete this metric?')) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`${base}/unit-economics/metrics/${metricId}`, { method: 'DELETE' })
      setMsg('Metric deleted.')
      void reloadMetrics()
      void reloadComputed()
    } catch (e2) {
      setErr(formatApiError(e2))
    }
  }

  if (!companyId || !connectionId) {
    return (
      <div className="page">
        <div className="page-title-row">
          <h1 className="page-title">Unit Economics</h1>
          <button
            type="button"
            className="page-help-btn"
            aria-label="How Unit Economics works"
            title="How Unit Economics works"
            onClick={() => setHelpOpen(true)}
          >
            ?
          </button>
        </div>
        <p className="empty">
          Select a company and OCI connection in the top bar.
          {companyId && !connectionId ? (
            <>
              {' '}
              <Link to="/connections">Set up a connection</Link>
            </>
          ) : null}
        </p>
        {helpOpen ? <UnitEconomicsHelpModal onClose={() => setHelpOpen(false)} /> : null}
      </div>
    )
  }

  const metricRows = metrics ?? []
  const currency = computed?.currency ?? 'USD'

  return (
    <div className="page">
      <header className="dashboard-header">
        <div className="page-title-row page-title-row--centered">
          <h1 className="page-title">Unit Economics</h1>
          <button
            type="button"
            className="page-help-btn"
            aria-label="How Unit Economics works"
            title="How Unit Economics works"
            onClick={() => setHelpOpen(true)}
          >
            ?
          </button>
        </div>
        <p className="page-lead">
          Track business metrics (customers, seats, deployments) and see cost per unit over a date
          range.
        </p>
      </header>

      <Alert type="error">{err || metricsError || computedError}</Alert>
      <Alert type="success">{msg}</Alert>

      <div className="filters">
        <label>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>

      <h2>Cost per unit</h2>
      {computedLoading && !computed ? (
        <p className="loading">Computing…</p>
      ) : !computed || computed.items.length === 0 ? (
        <p className="empty">
          No unit economics yet. Add a business metric below.
          {computed ? ` Period cost: ${formatMoney(computed.period_cost, currency)}.` : ''}
        </p>
      ) : (
        <>
          <p className="page-lead" style={{ marginTop: 0 }}>
            Period cost: {formatMoney(computed.period_cost, currency)}
          </p>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Units</th>
                  <th>Cost / unit</th>
                </tr>
              </thead>
              <tbody>
                {computed.items.map((item) => (
                  <tr key={item.metric_id}>
                    <td>
                      {item.name}
                      <span className="page-lead" style={{ marginLeft: 6, fontSize: 12 }}>
                        ({item.unit_label})
                      </span>
                    </td>
                    <td>{item.metric_value}</td>
                    <td>{formatMoney(item.cost_per_unit, item.currency ?? currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={{ marginTop: '1.75rem' }}>Business metrics</h2>
      {metricsLoading && !metrics ? (
        <p className="loading">Loading metrics…</p>
      ) : metricRows.length === 0 ? (
        <p className="empty">No metrics yet.</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Unit</th>
                <th>Value</th>
                <th>Period</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {metricRows.map((m) => (
                <tr key={m.metric_id}>
                  <td>{m.name}</td>
                  <td>{m.unit_label}</td>
                  <td>{m.value}</td>
                  <td>{m.period}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void deleteMetric(m.metric_id)}
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
            placeholder="e.g. Active customers"
            required
          />
        </label>
        <label>
          Unit label
          <input
            value={form.unit_label}
            onChange={(e) => setForm((f) => ({ ...f, unit_label: e.target.value }))}
            placeholder="e.g. customers"
            required
          />
        </label>
        <label>
          Value
          <input
            type="number"
            min="0.0001"
            step="any"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
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
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Add metric
        </button>
      </form>

      {helpOpen ? <UnitEconomicsHelpModal onClose={() => setHelpOpen(false)} /> : null}
    </div>
  )
}

function UnitEconomicsHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How Unit Economics works" onClose={onClose} wide>
      <div className="help-modal-body">
        <p>
          Unit Economics answers: <strong>how much cloud spend does each unit of your business
          cost?</strong>
        </p>
        <p>
          OCI already knows your cloud bill. It does not know your business counts (customers,
          seats, API calls, etc.). You add those as <strong>business metrics</strong>, and this page
          divides period cloud cost by each metric:
        </p>
        <p className="help-modal-formula">
          cost per unit = total OCI cost in the date range ÷ your metric value
        </p>

        <h3>How to use it</h3>
        <ol>
          <li>
            Add a metric — e.g. name <em>Active customers</em>, unit <em>customer</em>, value{' '}
            <em>120</em>, period <em>monthly</em>.
          </li>
          <li>Pick a date range (default last 30 days).</li>
          <li>Read the computed <strong>cost per unit</strong> next to each metric.</li>
        </ol>

        <h3>What it tells you</h3>
        <p>Examples if the period cost is $12,000:</p>
        <ul>
          <li>120 customers → <strong>$100 / customer</strong></li>
          <li>4,000 seats → <strong>$3 / seat</strong></li>
          <li>2M API calls → <strong>$0.006 / call</strong></li>
        </ul>
        <p>
          Useful for pricing, margin checks, and spotting when infra cost per customer is climbing
          even if the raw bill looks normal.
        </p>

        <h3>Current limits</h3>
        <p>
          One static value per metric, total cloud cost (not by service or compartment), and no
          history yet. Update the metric when the business number changes.
        </p>
      </div>
    </Modal>
  )
}
