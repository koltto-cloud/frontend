import { Fragment, useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useClientPagination } from '@/hooks/useClientPagination'
import { Alert } from '@/components/Alert'
import PaginationControls from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'
import { CATALOG_STATUSES, PLAN_TYPES } from '@/pages/catalog/constants'

interface PlanRow {
  plan_id: string
  plan_type: string
  name: string
  description: string
  price: number
  status: string
}

interface BundleRow {
  plan_feature_id: string
  plan_name: string
  feature_name: string
  sku: string
  status: string
}

interface ServiceOption {
  feature_id: string
  name: string
}

const emptyBundleForm = {
  feature_id: '',
  sku: '',
  status: 'active',
  notes: '',
}

export default function PlansPage() {
  const [name, setName] = useState('')
  const [planType, setPlanType] = useState('')
  const [planStatus, setPlanStatus] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null)
  const [bundlesByPlan, setBundlesByPlan] = useState<Record<string, BundleRow[]>>({})
  const [bundlesLoadingId, setBundlesLoadingId] = useState<string | null>(null)

  const [viewId, setViewId] = useState<string | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [editRow, setEditRow] = useState<PlanRow | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', status: 'active', notes: '' })

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    plan_type: 'paid',
    name: '',
    description: '',
    price: '',
    notes: '',
  })

  const [addBundlePlan, setAddBundlePlan] = useState<PlanRow | null>(null)
  const [bundleForm, setBundleForm] = useState(emptyBundleForm)

  const [editBundle, setEditBundle] = useState<BundleRow | null>(null)
  const [editBundleForm, setEditBundleForm] = useState({ sku: '', status: 'active', notes: '' })

  const [viewBundleId, setViewBundleId] = useState<string | null>(null)
  const [viewBundleData, setViewBundleData] = useState<Record<string, unknown> | null>(null)
  const [viewBundleLoading, setViewBundleLoading] = useState(false)

  const { data: services } = useAsyncData(
    () =>
      apiRequest<ServiceOption[]>('/api/v1/catalog/feature/list', {
        query: { feature_status: 'active' },
      }),
    [],
  )

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<PlanRow[]>('/api/v1/catalog/plan/list', {
        query: { name, plan_type: planType, plan_status: planStatus },
      }),
    [name, planType, planStatus],
  )

  const rows = data ?? []
  const serviceOptions = services ?? []
  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(rows)

  const loadBundles = async (planId: string) => {
    setBundlesLoadingId(planId)
    setErr('')
    try {
      const list = await apiRequest<BundleRow[]>('/api/v1/catalog/plan_feature/list', {
        query: { plan_id: planId },
      })
      setBundlesByPlan((prev) => ({ ...prev, [planId]: list }))
    } catch (e) {
      setErr(formatApiError(e))
    } finally {
      setBundlesLoadingId(null)
    }
  }

  const toggleExpand = (planId: string) => {
    if (expandedPlanId === planId) {
      setExpandedPlanId(null)
      return
    }
    setExpandedPlanId(planId)
    void loadBundles(planId)
  }

  const openView = async (id: string) => {
    setViewId(id)
    setViewData(null)
    setViewLoading(true)
    setErr('')
    try {
      setViewData(await apiRequest(`/api/v1/catalog/plan/${id}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewId(null)
    } finally {
      setViewLoading(false)
    }
  }

  const openEdit = (row: PlanRow) => {
    setEditRow(row)
    setEditForm({
      name: row.name,
      description: row.description,
      price: String(row.price),
      status: row.status,
      notes: '',
    })
    setErr('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRow) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/catalog/plan/${editRow.plan_id}`, {
        method: 'PUT',
        body: {
          name: editForm.name,
          description: editForm.description,
          price: Number(editForm.price),
          status: editForm.status,
          notes: editForm.notes || null,
        },
      })
      setMsg('Plan updated.')
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
      await apiRequest('/api/v1/catalog/plan/create', {
        method: 'POST',
        body: {
          ...createForm,
          price: Number(createForm.price),
          notes: createForm.notes || null,
        },
      })
      setMsg('Plan created.')
      setShowCreate(false)
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleDelete = async (row: PlanRow) => {
    if (!confirm(`Delete plan "${row.name}"?`)) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/catalog/plan/${row.plan_id}`, { method: 'DELETE' })
      setMsg('Plan deleted.')
      if (expandedPlanId === row.plan_id) setExpandedPlanId(null)
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const openViewBundle = async (id: string) => {
    setViewBundleId(id)
    setViewBundleData(null)
    setViewBundleLoading(true)
    setErr('')
    try {
      setViewBundleData(await apiRequest(`/api/v1/catalog/plan_feature/${id}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewBundleId(null)
    } finally {
      setViewBundleLoading(false)
    }
  }

  const openAddBundle = (plan: PlanRow) => {
    setAddBundlePlan(plan)
    setBundleForm(emptyBundleForm)
    setErr('')
  }

  const handleAddBundle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addBundlePlan) return
    setErr('')
    setMsg('')
    try {
      await apiRequest('/api/v1/catalog/plan_feature/create', {
        method: 'POST',
        body: {
          plan_id: addBundlePlan.plan_id,
          feature_id: bundleForm.feature_id,
          sku: bundleForm.sku,
          status: bundleForm.status,
          notes: bundleForm.notes || null,
        },
      })
      setMsg('Service added to plan.')
      setAddBundlePlan(null)
      setBundleForm(emptyBundleForm)
      void loadBundles(addBundlePlan.plan_id)
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const openEditBundle = (bundle: BundleRow) => {
    setEditBundle(bundle)
    setEditBundleForm({ sku: bundle.sku, status: bundle.status, notes: '' })
    setErr('')
  }

  const handleEditBundle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editBundle || !expandedPlanId) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/catalog/plan_feature/${editBundle.plan_feature_id}`, {
        method: 'PUT',
        body: {
          sku: editBundleForm.sku,
          status: editBundleForm.status,
          notes: editBundleForm.notes || null,
        },
      })
      setMsg('Service bundle updated.')
      setEditBundle(null)
      void loadBundles(expandedPlanId)
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleDeleteBundle = async (bundle: BundleRow) => {
    if (!confirm(`Remove service "${bundle.feature_name}" (${bundle.sku}) from this plan?`)) return
    if (!expandedPlanId) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/catalog/plan_feature/${bundle.plan_feature_id}`, { method: 'DELETE' })
      setMsg('Service removed from plan.')
      void loadBundles(expandedPlanId)
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  return (
    <>
      <h1 className="page-title">Plans</h1>
      <p className="alert alert-info" style={{ marginTop: 0 }}>
        Expand a plan to manage its <strong>service bundles</strong> (services linked to that plan).
      </p>
      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          Create plan
        </button>
      </div>
      <div className="filters">
        <label>
          Name <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Plan type
          <select value={planType} onChange={(e) => setPlanType(e.target.value)}>
            <option value="">All</option>
            {PLAN_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={planStatus} onChange={(e) => setPlanStatus(e.target.value)}>
            <option value="">All</option>
            {CATALOG_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={() => void reload()}>Search</button>
      </div>
      <Alert type="error">{error || err}</Alert>
      <Alert type="success">{msg}</Alert>
      {loading ? (
        <p className="loading">Loading…</p>
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-expand" aria-label="Expand" />
                  <th>Plan ID</th>
                  <th>Plan type</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => {
                  const open = expandedPlanId === row.plan_id
                  const bundles = bundlesByPlan[row.plan_id] ?? []
                  return (
                    <Fragment key={row.plan_id}>
                      <tr className={open ? 'row-plan-expanded' : undefined}>
                        <td className="col-expand">
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            aria-expanded={open}
                            aria-label={open ? 'Collapse service bundles' : 'Expand service bundles'}
                            onClick={() => toggleExpand(row.plan_id)}
                          >
                            <span className="expand-chevron">{open ? '▾' : '▸'}</span>
                          </button>
                        </td>
                        <td>
                          <button type="button" className="id-link" onClick={() => void openView(row.plan_id)}>
                            {row.plan_id.slice(0, 8)}…
                          </button>
                        </td>
                        <td>{row.plan_type}</td>
                        <td>{row.name}</td>
                        <td>{row.description}</td>
                        <td>{row.price}</td>
                        <td>{row.status}</td>
                        <td className="actions-cell">
                          <button type="button" className="btn btn-sm" onClick={() => openEdit(row)}>Edit</button>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => void handleDelete(row)}>Delete</button>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="nested-detail-row">
                          <td colSpan={8}>
                            <div className="nested-panel">
                              <div className="nested-panel-header">
                                <p className="nested-panel-title">Service bundles — {row.name}</p>
                                <button type="button" className="btn btn-sm btn-primary" onClick={() => openAddBundle(row)}>
                                  Add service
                                </button>
                              </div>
                              {bundlesLoadingId === row.plan_id ? (
                                <p className="loading">Loading bundles…</p>
                              ) : bundles.length === 0 ? (
                                <p className="empty">No services on this plan yet.</p>
                              ) : (
                                <table className="nested-table">
                                  <thead>
                                    <tr>
                                      <th>Bundle ID</th>
                                      <th>Service</th>
                                      <th>SKU</th>
                                      <th>Status</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {bundles.map((b) => (
                                      <tr key={b.plan_feature_id}>
                                        <td>
                                          <button
                                            type="button"
                                            className="id-link"
                                            onClick={() => void openViewBundle(b.plan_feature_id)}
                                          >
                                            {b.plan_feature_id.slice(0, 8)}…
                                          </button>
                                        </td>
                                        <td>{b.feature_name}</td>
                                        <td>{b.sku}</td>
                                        <td>{b.status}</td>
                                        <td className="actions-cell">
                                          <button type="button" className="btn btn-sm" onClick={() => openEditBundle(b)}>Edit</button>
                                          <button type="button" className="btn btn-sm btn-danger" onClick={() => void handleDeleteBundle(b)}>Remove</button>
                                        </td>
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
        <Modal title="Create plan" onClose={() => setShowCreate(false)}>
          <form className="inline-form" onSubmit={(e) => void handleCreate(e)}>
            <div className="form-field">
              <label>Plan type</label>
              <select value={createForm.plan_type} onChange={(e) => setCreateForm({ ...createForm, plan_type: e.target.value })}>
                {PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {(['name', 'description', 'price', 'notes'] as const).map((f) => (
              <div key={f} className="form-field">
                <label>{f}</label>
                <input
                  value={createForm[f]}
                  onChange={(e) => setCreateForm({ ...createForm, [f]: e.target.value })}
                  required={f !== 'notes'}
                />
              </div>
            ))}
            <button type="submit" className="btn btn-primary">Create</button>
          </form>
        </Modal>
      )}
      {editRow && (
        <Modal title={`Edit plan — ${editRow.name}`} onClose={() => setEditRow(null)}>
          <form className="inline-form" onSubmit={(e) => void handleEdit(e)}>
            {(['name', 'description', 'price', 'notes'] as const).map((f) => (
              <div key={f} className="form-field">
                <label>{f}</label>
                <input value={editForm[f]} onChange={(e) => setEditForm({ ...editForm, [f]: e.target.value })} />
              </div>
            ))}
            <div className="form-field">
              <label>Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                {CATALOG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Save</button>
          </form>
        </Modal>
      )}
      {addBundlePlan && (
        <Modal title={`Add service — ${addBundlePlan.name}`} onClose={() => setAddBundlePlan(null)}>
          <form className="inline-form" onSubmit={(e) => void handleAddBundle(e)}>
            <div className="form-field">
              <label>Service</label>
              <select
                value={bundleForm.feature_id}
                onChange={(e) => setBundleForm({ ...bundleForm, feature_id: e.target.value })}
                required
              >
                <option value="">Select service…</option>
                {serviceOptions.map((s) => (
                  <option key={s.feature_id} value={s.feature_id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>SKU</label>
              <input
                value={bundleForm.sku}
                onChange={(e) => setBundleForm({ ...bundleForm, sku: e.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select
                value={bundleForm.status}
                onChange={(e) => setBundleForm({ ...bundleForm, status: e.target.value })}
              >
                {CATALOG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Notes</label>
              <input
                value={bundleForm.notes}
                onChange={(e) => setBundleForm({ ...bundleForm, notes: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
        </Modal>
      )}
      {editBundle && (
        <Modal title={`Edit bundle — ${editBundle.feature_name}`} onClose={() => setEditBundle(null)}>
          <form className="inline-form" onSubmit={(e) => void handleEditBundle(e)}>
            <div className="form-field">
              <label>SKU</label>
              <input
                value={editBundleForm.sku}
                onChange={(e) => setEditBundleForm({ ...editBundleForm, sku: e.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select
                value={editBundleForm.status}
                onChange={(e) => setEditBundleForm({ ...editBundleForm, status: e.target.value })}
              >
                {CATALOG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Notes</label>
              <input
                value={editBundleForm.notes}
                onChange={(e) => setEditBundleForm({ ...editBundleForm, notes: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary">Save</button>
          </form>
        </Modal>
      )}
      {viewId && (
        <Modal title="Plan details" onClose={() => setViewId(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
      {viewBundleId && (
        <Modal title="Service bundle details" onClose={() => setViewBundleId(null)} wide>
          {viewBundleLoading ? <p className="loading">Loading…</p> : viewBundleData && <JsonViewer data={viewBundleData} />}
        </Modal>
      )}
    </>
  )
}
