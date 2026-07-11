import { useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'
import { fromDatetimeLocal, INVOICE_STATUSES, toDatetimeLocal } from '@/pages/billing/constants'

interface InvoiceRow {
  invoice_id: string
  company: { company_id: string; name: string }
  status: string
  due_date: string
  created_at: string
}

export default function InvoicesPage() {
  const [subscriptionId, setSubscriptionId] = useState('')
  const [invoiceStatus, setInvoiceStatus] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [viewId, setViewId] = useState<string | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [editRow, setEditRow] = useState<InvoiceRow | null>(null)
  const [editForm, setEditForm] = useState({ status: 'draft', due_date: '', tax: '0', discount: '0' })

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    subscription_id: '',
    due_date: '',
    tax: '0',
    discount: '0',
  })

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<InvoiceRow[]>('/api/v1/billing/invoice/list', {
        query: {
          subscription_id: subscriptionId || undefined,
          invoice_status: invoiceStatus || undefined,
        },
      }),
    [subscriptionId, invoiceStatus],
  )

  const openView = async (id: string) => {
    setViewId(id)
    setViewData(null)
    setViewLoading(true)
    setErr('')
    try {
      setViewData(await apiRequest(`/api/v1/billing/invoice/${id}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewId(null)
    } finally {
      setViewLoading(false)
    }
  }

  const openEdit = async (row: InvoiceRow) => {
    setEditRow(row)
    setEditForm({ status: row.status, due_date: toDatetimeLocal(row.due_date), tax: '0', discount: '0' })
    setErr('')
    try {
      const detail = await apiRequest<{ tax?: number; discount?: number }>(`/api/v1/billing/invoice/${row.invoice_id}`)
      setEditForm({
        status: row.status,
        due_date: toDatetimeLocal(row.due_date),
        tax: String(detail.tax ?? 0),
        discount: String(detail.discount ?? 0),
      })
    } catch {
      // keep defaults
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRow) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/billing/invoice/${editRow.invoice_id}`, {
        method: 'PUT',
        body: {
          status: editForm.status,
          due_date: fromDatetimeLocal(editForm.due_date),
          tax: Number(editForm.tax),
          discount: Number(editForm.discount),
        },
      })
      setMsg('Invoice updated.')
      setEditRow(null)
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    try {
      await apiRequest('/api/v1/billing/invoice/create', {
        method: 'POST',
        body: {
          subscription_id: createForm.subscription_id,
          due_date: fromDatetimeLocal(createForm.due_date),
          tax: Number(createForm.tax),
          discount: Number(createForm.discount),
        },
      })
      setMsg('Invoice created.')
      setShowCreate(false)
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  return (
    <>
      <h1 className="page-title">Invoices</h1>
      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>Create invoice</button>
      </div>
      <div className="filters">
        <label>Subscription ID <input value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} /></label>
        <label>
          Status
          <select value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value)}>
            <option value="">All</option>
            {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={() => void reload()}>Search</button>
      </div>
      <Alert type="error">{error || err}</Alert>
      <Alert type="success">{msg}</Alert>
      {loading ? <p className="loading">Loading…</p> : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>invoice_id</th><th>company</th><th>status</th><th>due_date</th><th>created_at</th><th>actions</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((row) => (
                <tr key={row.invoice_id}>
                  <td>
                    <button type="button" className="id-link" onClick={() => void openView(row.invoice_id)}>
                      {row.invoice_id.slice(0, 8)}…
                    </button>
                  </td>
                  <td>{row.company?.name}</td>
                  <td>{row.status}</td>
                  <td>{row.due_date?.slice(0, 10)}</td>
                  <td>{row.created_at?.slice(0, 10)}</td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-sm" onClick={() => void openEdit(row)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showCreate && (
        <Modal title="Create invoice" onClose={() => setShowCreate(false)}>
          <form className="inline-form" onSubmit={(e) => void handleCreate(e)}>
            <div className="form-field"><label>Subscription ID</label><input value={createForm.subscription_id} onChange={(e) => setCreateForm({ ...createForm, subscription_id: e.target.value })} required /></div>
            <div className="form-field"><label>Due date</label><input type="datetime-local" value={createForm.due_date} onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })} required /></div>
            <div className="form-field"><label>Tax</label><input type="number" step="0.01" value={createForm.tax} onChange={(e) => setCreateForm({ ...createForm, tax: e.target.value })} required /></div>
            <div className="form-field"><label>Discount</label><input type="number" step="0.01" value={createForm.discount} onChange={(e) => setCreateForm({ ...createForm, discount: e.target.value })} required /></div>
            <button type="submit" className="btn btn-primary">Create</button>
          </form>
        </Modal>
      )}
      {editRow && (
        <Modal title={`Edit invoice — ${editRow.company?.name}`} onClose={() => setEditRow(null)}>
          <form className="inline-form" onSubmit={(e) => void handleEdit(e)}>
            <div className="form-field">
              <label>Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Due date</label><input type="datetime-local" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} /></div>
            <div className="form-field"><label>Tax</label><input type="number" step="0.01" value={editForm.tax} onChange={(e) => setEditForm({ ...editForm, tax: e.target.value })} /></div>
            <div className="form-field"><label>Discount</label><input type="number" step="0.01" value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })} /></div>
            <button type="submit" className="btn btn-primary">Save</button>
          </form>
        </Modal>
      )}
      {viewId && (
        <Modal title="Invoice details" onClose={() => setViewId(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
    </>
  )
}
