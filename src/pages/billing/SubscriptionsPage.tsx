import { Fragment, useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useClientPagination } from '@/hooks/useClientPagination'
import { Alert } from '@/components/Alert'
import PaginationControls from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'
import { fromDatetimeLocal, SUBSCRIPTION_STATUSES, toDatetimeLocal } from '@/pages/billing/constants'

interface SubscriptionRow {
  subscription_id: string
  company: { company_id: string; name: string }
  status: string
  start_date: string
  end_date?: string | null
}

interface SubscriptionItemRow {
  subscription_id: string
  plan_feature_id?: string
  company_name: string
  plan_name: string
  feature_name: string
  sku: string
  status: string
}

interface CompanyOption {
  company_id: string
  name: string
}

interface PlanOption {
  plan_id: string
  name: string
}

function shortId(id: string | null | undefined): string {
  if (!id) return '—'
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

export default function SubscriptionsPage() {
  const [companyId, setCompanyId] = useState('')
  const [subStatus, setSubStatus] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [expandedSubId, setExpandedSubId] = useState<string | null>(null)
  const [itemsBySub, setItemsBySub] = useState<Record<string, SubscriptionItemRow[]>>({})
  const [itemsLoadingId, setItemsLoadingId] = useState<string | null>(null)

  const [viewId, setViewId] = useState<string | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [viewItemKey, setViewItemKey] = useState<{ subscriptionId: string; planFeatureId: string } | null>(null)
  const [viewItemData, setViewItemData] = useState<Record<string, unknown> | null>(null)
  const [viewItemLoading, setViewItemLoading] = useState(false)

  const [editRow, setEditRow] = useState<SubscriptionRow | null>(null)
  const [editForm, setEditForm] = useState({ status: 'active', start_date: '', end_date: '' })

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    company_id: '',
    plan_id: '',
    start_date: '',
    end_date: '',
  })

  const { data: companies } = useAsyncData(
    () => apiRequest<CompanyOption[]>('/api/v1/identity/companies/list'),
    [],
  )
  const { data: plans } = useAsyncData(
    () =>
      apiRequest<PlanOption[]>('/api/v1/catalog/plan/list', {
        query: { plan_status: 'active' },
      }),
    [],
  )

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<SubscriptionRow[]>('/api/v1/billing/subscription/list', {
        query: { company_id: companyId || undefined, subscription_status: subStatus || undefined },
      }),
    [companyId, subStatus],
  )

  const rows = data ?? []
  const companyOptions = companies ?? []
  const planOptions = plans ?? []
  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(rows)

  const loadItems = async (subscriptionId: string) => {
    setItemsLoadingId(subscriptionId)
    setErr('')
    try {
      const list = await apiRequest<SubscriptionItemRow[]>('/api/v1/catalog/subscription_item/list', {
        query: { subscription_id: subscriptionId },
      })
      setItemsBySub((prev) => ({ ...prev, [subscriptionId]: list }))
    } catch (e) {
      setErr(formatApiError(e))
    } finally {
      setItemsLoadingId(null)
    }
  }

  const toggleExpand = (subscriptionId: string) => {
    if (expandedSubId === subscriptionId) {
      setExpandedSubId(null)
      return
    }
    setExpandedSubId(subscriptionId)
    void loadItems(subscriptionId)
  }

  const openView = async (id: string) => {
    setViewId(id)
    setViewData(null)
    setViewLoading(true)
    setErr('')
    try {
      setViewData(await apiRequest(`/api/v1/billing/subscription/${id}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewId(null)
    } finally {
      setViewLoading(false)
    }
  }

  const openViewItem = async (subscriptionId: string, planFeatureId: string) => {
    setViewItemKey({ subscriptionId, planFeatureId })
    setViewItemData(null)
    setViewItemLoading(true)
    setErr('')
    try {
      setViewItemData(
        await apiRequest(`/api/v1/catalog/subscription_item/${subscriptionId}/${planFeatureId}`),
      )
    } catch (e) {
      setErr(formatApiError(e))
      setViewItemKey(null)
    } finally {
      setViewItemLoading(false)
    }
  }

  const openEdit = (row: SubscriptionRow) => {
    setEditRow(row)
    setEditForm({
      status: row.status,
      start_date: toDatetimeLocal(row.start_date),
      end_date: toDatetimeLocal(row.end_date),
    })
    setErr('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRow) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/billing/subscription/${editRow.subscription_id}`, {
        method: 'PUT',
        body: {
          status: editForm.status,
          start_date: fromDatetimeLocal(editForm.start_date),
          end_date: editForm.end_date ? fromDatetimeLocal(editForm.end_date) : null,
        },
      })
      setMsg('Subscription updated.')
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
      const created = await apiRequest<SubscriptionRow>('/api/v1/billing/subscription/create', {
        method: 'POST',
        body: {
          company_id: createForm.company_id,
          plan_id: createForm.plan_id,
          start_date: fromDatetimeLocal(createForm.start_date),
          end_date: createForm.end_date ? fromDatetimeLocal(createForm.end_date) : null,
        },
      })
      setMsg('Subscription created (items auto-generated from plan service bundles).')
      setShowCreate(false)
      void reload()
      if (created?.subscription_id) {
        setExpandedSubId(created.subscription_id)
        void loadItems(created.subscription_id)
      }
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  return (
    <>
      <h1 className="page-title">Subscriptions</h1>
      <p className="alert alert-info" style={{ marginTop: 0 }}>
        Expand a subscription to see its items. Items are <strong>auto-created</strong> from the plan’s
        service bundles when you create a subscription (not added manually).
      </p>
      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>Create subscription</button>
      </div>
      <div className="filters">
        <label>
          Company
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">All</option>
            {companyOptions.map((c) => (
              <option key={c.company_id} value={c.company_id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)}>
            <option value="">All</option>
            {SUBSCRIPTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
                  <th>Subscription ID</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Start date</th>
                  <th>End date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => {
                  const open = expandedSubId === row.subscription_id
                  const items = itemsBySub[row.subscription_id] ?? []
                  return (
                    <Fragment key={row.subscription_id}>
                      <tr className={open ? 'row-subscription-expanded' : undefined}>
                        <td className="col-expand">
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            aria-expanded={open}
                            aria-label={open ? 'Collapse subscription items' : 'Expand subscription items'}
                            onClick={() => toggleExpand(row.subscription_id)}
                          >
                            <span className="expand-chevron">{open ? '▾' : '▸'}</span>
                          </button>
                        </td>
                        <td>
                          <button type="button" className="id-link" onClick={() => void openView(row.subscription_id)}>
                            {shortId(row.subscription_id)}
                          </button>
                        </td>
                        <td>{row.company?.name}</td>
                        <td>{row.status}</td>
                        <td>{row.start_date?.slice(0, 10)}</td>
                        <td>{row.end_date?.slice(0, 10) ?? '—'}</td>
                        <td className="actions-cell">
                          <button type="button" className="btn btn-sm" onClick={() => openEdit(row)}>Edit</button>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="nested-detail-row">
                          <td colSpan={7}>
                            <div className="nested-panel">
                              <div className="nested-panel-header">
                                <p className="nested-panel-title">Subscription items — {shortId(row.subscription_id)}</p>
                              </div>
                              {itemsLoadingId === row.subscription_id ? (
                                <p className="loading">Loading items…</p>
                              ) : items.length === 0 ? (
                                <p className="empty">No items (plan may have had no service bundles at create time).</p>
                              ) : (
                                <table className="nested-table">
                                  <thead>
                                    <tr>
                                      <th>Bundle ID</th>
                                      <th>Plan</th>
                                      <th>Service</th>
                                      <th>SKU</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item, idx) => (
                                      <tr key={item.plan_feature_id || `${item.subscription_id}-${idx}`}>
                                        <td>
                                          {item.plan_feature_id ? (
                                            <button
                                              type="button"
                                              className="id-link"
                                              onClick={() =>
                                                void openViewItem(item.subscription_id, item.plan_feature_id!)
                                              }
                                            >
                                              {shortId(item.plan_feature_id)}
                                            </button>
                                          ) : (
                                            '—'
                                          )}
                                        </td>
                                        <td>{item.plan_name}</td>
                                        <td>{item.feature_name}</td>
                                        <td>{item.sku}</td>
                                        <td>{item.status}</td>
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
        <Modal title="Create subscription" onClose={() => setShowCreate(false)}>
          <form className="inline-form" onSubmit={(e) => void handleCreate(e)}>
            <div className="form-field">
              <label>Company</label>
              <select
                value={createForm.company_id}
                onChange={(e) => setCreateForm({ ...createForm, company_id: e.target.value })}
                required
              >
                <option value="">Select company…</option>
                {companyOptions.map((c) => (
                  <option key={c.company_id} value={c.company_id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Plan</label>
              <select
                value={createForm.plan_id}
                onChange={(e) => setCreateForm({ ...createForm, plan_id: e.target.value })}
                required
              >
                <option value="">Select plan…</option>
                {planOptions.map((p) => (
                  <option key={p.plan_id} value={p.plan_id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field"><label>Start date</label><input type="datetime-local" value={createForm.start_date} onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })} required /></div>
            <div className="form-field"><label>End date (optional)</label><input type="datetime-local" value={createForm.end_date} onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })} /></div>
            <button type="submit" className="btn btn-primary">Create</button>
          </form>
        </Modal>
      )}
      {editRow && (
        <Modal title={`Edit subscription — ${editRow.company?.name}`} onClose={() => setEditRow(null)}>
          <form className="inline-form" onSubmit={(e) => void handleEdit(e)}>
            <div className="form-field">
              <label>Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                {SUBSCRIPTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Start date</label><input type="datetime-local" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} /></div>
            <div className="form-field"><label>End date</label><input type="datetime-local" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} /></div>
            <button type="submit" className="btn btn-primary">Save</button>
          </form>
        </Modal>
      )}
      {viewId && (
        <Modal title="Subscription details" onClose={() => setViewId(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
      {viewItemKey && (
        <Modal title="Subscription item details" onClose={() => setViewItemKey(null)} wide>
          {viewItemLoading ? <p className="loading">Loading…</p> : viewItemData && <JsonViewer data={viewItemData} />}
        </Modal>
      )}
    </>
  )
}
