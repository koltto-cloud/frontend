import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useClientPagination } from '@/hooks/useClientPagination'
import { Alert } from '@/components/Alert'
import PaginationControls from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'
import { fromDateInput, INVOICE_STATUSES, toDateInput } from '@/pages/billing/constants'

interface InvoiceRow {
  invoice_id: string
  company: { company_id: string; name: string }
  status: string
  due_date: string
  created_at: string
}

interface InvoiceItemRow {
  invoice_item_id: string
  sku: string
  name: string
  quantity: number
  price: number
  discount: number
}

interface SubscriptionOption {
  subscription_id: string
  company: { company_id: string; name: string }
  status: string
}

const emptyItemForm = {
  sku: '',
  name: '',
  description: '',
  quantity: '1',
  price: '0',
  discount: '0',
}

function shortId(id: string | null | undefined): string {
  if (!id) return '—'
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

export default function InvoicesPage() {
  const { t } = useTranslation()
  const [subscriptionId, setSubscriptionId] = useState('')
  const [invoiceStatus, setInvoiceStatus] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null)
  const [itemsByInvoice, setItemsByInvoice] = useState<Record<string, InvoiceItemRow[]>>({})
  const [itemsLoadingId, setItemsLoadingId] = useState<string | null>(null)

  const [viewId, setViewId] = useState<string | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [viewItemId, setViewItemId] = useState<string | null>(null)
  const [viewItemData, setViewItemData] = useState<Record<string, unknown> | null>(null)
  const [viewItemLoading, setViewItemLoading] = useState(false)

  const [editRow, setEditRow] = useState<InvoiceRow | null>(null)
  const [editForm, setEditForm] = useState({ status: 'draft', due_date: '', tax: '0', discount: '0' })

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    subscription_id: '',
    due_date: '',
    tax: '0',
    discount: '0',
  })

  const [addItemInvoice, setAddItemInvoice] = useState<InvoiceRow | null>(null)
  const [itemForm, setItemForm] = useState(emptyItemForm)

  const { data: subscriptions } = useAsyncData(
    () => apiRequest<SubscriptionOption[]>('/api/v1/billing/subscription/list'),
    [],
  )

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

  const rows = data ?? []
  const subscriptionOptions = subscriptions ?? []
  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(rows)

  const loadItems = async (invoiceId: string) => {
    setItemsLoadingId(invoiceId)
    setErr('')
    try {
      const list = await apiRequest<InvoiceItemRow[]>('/api/v1/billing/invoice-item/list', {
        query: { invoice_id: invoiceId },
      })
      setItemsByInvoice((prev) => ({ ...prev, [invoiceId]: list }))
    } catch (e) {
      setErr(formatApiError(e))
    } finally {
      setItemsLoadingId(null)
    }
  }

  const toggleExpand = (invoiceId: string) => {
    if (expandedInvoiceId === invoiceId) {
      setExpandedInvoiceId(null)
      return
    }
    setExpandedInvoiceId(invoiceId)
    void loadItems(invoiceId)
  }

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

  const openViewItem = async (id: string) => {
    setViewItemId(id)
    setViewItemData(null)
    setViewItemLoading(true)
    setErr('')
    try {
      setViewItemData(await apiRequest(`/api/v1/billing/invoice-item/${id}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewItemId(null)
    } finally {
      setViewItemLoading(false)
    }
  }

  const openEdit = async (row: InvoiceRow) => {
    setEditRow(row)
    setEditForm({ status: row.status, due_date: toDateInput(row.due_date), tax: '0', discount: '0' })
    setErr('')
    try {
      const detail = await apiRequest<{ tax?: number; discount?: number }>(`/api/v1/billing/invoice/${row.invoice_id}`)
      setEditForm({
        status: row.status,
        due_date: toDateInput(row.due_date),
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
          due_date: fromDateInput(editForm.due_date),
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
          due_date: fromDateInput(createForm.due_date),
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

  const openAddItem = (invoice: InvoiceRow) => {
    setAddItemInvoice(invoice)
    setItemForm(emptyItemForm)
    setErr('')
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addItemInvoice) return
    setErr('')
    setMsg('')
    try {
      await apiRequest('/api/v1/billing/invoice-item/create', {
        method: 'POST',
        body: {
          invoice_id: addItemInvoice.invoice_id,
          ...itemForm,
          quantity: Number(itemForm.quantity),
          price: Number(itemForm.price),
          discount: Number(itemForm.discount),
        },
      })
      setMsg('Invoice item added.')
      setAddItemInvoice(null)
      setItemForm(emptyItemForm)
      void loadItems(addItemInvoice.invoice_id)
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  return (
    <>
      <h1 className="page-title">Invoices</h1>
      <p className="alert alert-info" style={{ marginTop: 0 }}>
        Expand an invoice to manage its <strong>line items</strong>.
      </p>
      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('modals.createInvoice')}</button>
      </div>
      <div className="filters">
        <label>
          Subscription ID
          <select value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)}>
            <option value="">All</option>
            {subscriptionOptions.map((s) => (
              <option key={s.subscription_id} value={s.subscription_id}>
                {shortId(s.subscription_id)} — {s.company?.name ?? '—'} ({s.status})
              </option>
            ))}
          </select>
        </label>
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
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-expand" aria-label="Expand" />
                  <th>Invoice ID</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Due date</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => {
                  const open = expandedInvoiceId === row.invoice_id
                  const items = itemsByInvoice[row.invoice_id] ?? []
                  return (
                    <Fragment key={row.invoice_id}>
                      <tr className={open ? 'row-invoice-expanded' : undefined}>
                        <td className="col-expand">
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            aria-expanded={open}
                            aria-label={open ? 'Collapse line items' : 'Expand line items'}
                            onClick={() => toggleExpand(row.invoice_id)}
                          >
                            <span className="expand-chevron">{open ? '▾' : '▸'}</span>
                          </button>
                        </td>
                        <td>
                          <button type="button" className="id-link" onClick={() => void openView(row.invoice_id)}>
                            {shortId(row.invoice_id)}
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
                      {open ? (
                        <tr className="nested-detail-row">
                          <td colSpan={7}>
                            <div className="nested-panel">
                              <div className="nested-panel-header">
                                <p className="nested-panel-title">Line items — {shortId(row.invoice_id)}</p>
                                <button type="button" className="btn btn-sm btn-primary" onClick={() => openAddItem(row)}>
                                  Add line item
                                </button>
                              </div>
                              {itemsLoadingId === row.invoice_id ? (
                                <p className="loading">Loading items…</p>
                              ) : items.length === 0 ? (
                                <p className="empty">No line items yet.</p>
                              ) : (
                                <table className="nested-table">
                                  <thead>
                                    <tr>
                                      <th>Item ID</th>
                                      <th>SKU</th>
                                      <th>Name</th>
                                      <th>Qty</th>
                                      <th>Price</th>
                                      <th>Discount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item) => (
                                      <tr key={item.invoice_item_id}>
                                        <td>
                                          <button
                                            type="button"
                                            className="id-link"
                                            onClick={() => void openViewItem(item.invoice_item_id)}
                                          >
                                            {shortId(item.invoice_item_id)}
                                          </button>
                                        </td>
                                        <td>{item.sku}</td>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>{item.price}</td>
                                        <td>{item.discount}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!loading && rows.length > 0 && (
            <PaginationControls
              page={page}
              pageSize={pageSize}
              itemCount={pageItems.length}
              totalItems={totalItems}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </>
      )}
      {showCreate && (
        <Modal title={t('modals.createInvoice')} onClose={() => setShowCreate(false)}>
          <form className="inline-form" onSubmit={(e) => void handleCreate(e)}>
            <div className="form-field">
              <label>Subscription ID</label>
              <select
                value={createForm.subscription_id}
                onChange={(e) => setCreateForm({ ...createForm, subscription_id: e.target.value })}
                required
              >
                <option value="">Select subscription…</option>
                {subscriptionOptions.map((s) => (
                  <option key={s.subscription_id} value={s.subscription_id}>
                    {s.subscription_id} — {s.company?.name ?? '—'} ({s.status})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field"><label>Due date</label><input type="date" value={createForm.due_date} onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })} required /></div>
            <div className="form-field"><label>Tax</label><input type="number" step="0.01" value={createForm.tax} onChange={(e) => setCreateForm({ ...createForm, tax: e.target.value })} required /></div>
            <div className="form-field"><label>Discount</label><input type="number" step="0.01" value={createForm.discount} onChange={(e) => setCreateForm({ ...createForm, discount: e.target.value })} required /></div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowCreate(false)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">{t('common.create')}</button>
            </div>
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
            <div className="form-field"><label>Due date</label><input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} /></div>
            <div className="form-field"><label>Tax</label><input type="number" step="0.01" value={editForm.tax} onChange={(e) => setEditForm({ ...editForm, tax: e.target.value })} /></div>
            <div className="form-field"><label>Discount</label><input type="number" step="0.01" value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })} /></div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setEditRow(null)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">{t('common.saveShort')}</button>
            </div>
          </form>
        </Modal>
      )}
      {addItemInvoice && (
        <Modal title={`Add line item — ${shortId(addItemInvoice.invoice_id)}`} onClose={() => setAddItemInvoice(null)}>
          <form className="inline-form" onSubmit={(e) => void handleAddItem(e)}>
            <div className="form-field"><label>SKU</label><input value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} required /></div>
            <div className="form-field"><label>Name</label><input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required /></div>
            <div className="form-field"><label>Description</label><input value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} required /></div>
            <div className="form-field"><label>Quantity</label><input type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} required /></div>
            <div className="form-field"><label>Price</label><input type="number" step="0.01" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} required /></div>
            <div className="form-field"><label>Discount</label><input type="number" step="0.01" value={itemForm.discount} onChange={(e) => setItemForm({ ...itemForm, discount: e.target.value })} required /></div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setAddItemInvoice(null)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">Add</button>
            </div>
          </form>
        </Modal>
      )}
      {viewId && (
        <Modal title={t('modals.invoiceDetails')} onClose={() => setViewId(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
      {viewItemId && (
        <Modal title={t('modals.invoiceItemDetails')} onClose={() => setViewItemId(null)} wide>
          {viewItemLoading ? <p className="loading">Loading…</p> : viewItemData && <JsonViewer data={viewItemData} />}
        </Modal>
      )}
    </>
  )
}
