import { useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'

interface InvoiceItemRow {
  invoice_item_id: string
  sku: string
  name: string
  quantity: number
  price: number
  discount: number
}

export default function InvoiceItemsPage() {
  const [invoiceId, setInvoiceId] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [viewId, setViewId] = useState<string | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    invoice_id: '',
    sku: '',
    name: '',
    description: '',
    quantity: '1',
    price: '0',
    discount: '0',
  })

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<InvoiceItemRow[]>('/api/v1/billing/invoice-item/list', {
        query: { invoice_id: invoiceId || undefined },
      }),
    [invoiceId],
  )

  const openView = async (id: string) => {
    setViewId(id)
    setViewData(null)
    setViewLoading(true)
    setErr('')
    try {
      setViewData(await apiRequest(`/api/v1/billing/invoice-item/${id}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewId(null)
    } finally {
      setViewLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    try {
      await apiRequest('/api/v1/billing/invoice-item/create', {
        method: 'POST',
        body: {
          ...createForm,
          quantity: Number(createForm.quantity),
          price: Number(createForm.price),
          discount: Number(createForm.discount),
        },
      })
      setMsg('Invoice item created.')
      setShowCreate(false)
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  return (
    <>
      <h1 className="page-title">Invoice Items</h1>
      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>Create invoice item</button>
      </div>
      <div className="filters">
        <label>Invoice ID <input value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} placeholder="filter by invoice" /></label>
        <button type="button" className="btn btn-primary" onClick={() => void reload()}>Search</button>
      </div>
      <Alert type="error">{error || err}</Alert>
      <Alert type="success">{msg}</Alert>
      {loading ? <p className="loading">Loading…</p> : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>invoice_item_id</th><th>sku</th><th>name</th><th>qty</th><th>price</th><th>discount</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((row) => (
                <tr key={row.invoice_item_id}>
                  <td>
                    <button type="button" className="id-link" onClick={() => void openView(row.invoice_item_id)}>
                      {row.invoice_item_id.slice(0, 8)}…
                    </button>
                  </td>
                  <td>{row.sku}</td>
                  <td>{row.name}</td>
                  <td>{row.quantity}</td>
                  <td>{row.price}</td>
                  <td>{row.discount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showCreate && (
        <Modal title="Create invoice item" onClose={() => setShowCreate(false)}>
          <form className="inline-form" onSubmit={(e) => void handleCreate(e)}>
            <div className="form-field"><label>Invoice ID</label><input value={createForm.invoice_id} onChange={(e) => setCreateForm({ ...createForm, invoice_id: e.target.value })} required /></div>
            <div className="form-field"><label>SKU</label><input value={createForm.sku} onChange={(e) => setCreateForm({ ...createForm, sku: e.target.value })} required /></div>
            <div className="form-field"><label>Name</label><input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required /></div>
            <div className="form-field"><label>Description</label><input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} required /></div>
            <div className="form-field"><label>Quantity</label><input type="number" value={createForm.quantity} onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })} required /></div>
            <div className="form-field"><label>Price</label><input type="number" step="0.01" value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })} required /></div>
            <div className="form-field"><label>Discount</label><input type="number" step="0.01" value={createForm.discount} onChange={(e) => setCreateForm({ ...createForm, discount: e.target.value })} required /></div>
            <button type="submit" className="btn btn-primary">Create</button>
          </form>
        </Modal>
      )}
      {viewId && (
        <Modal title="Invoice item details" onClose={() => setViewId(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
    </>
  )
}
