import { useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useClientPagination } from '@/hooks/useClientPagination'
import { Alert } from '@/components/Alert'
import PaginationControls from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'
import { CATALOG_STATUSES } from '@/pages/catalog/constants'

interface PlanFeatureRow {
  plan_feature_id: string
  plan_name: string
  feature_name: string
  sku: string
  status: string
}

export default function PlanFeaturesPage() {
  const [planId, setPlanId] = useState('')
  const [featureId, setFeatureId] = useState('')
  const [sku, setSku] = useState('')
  const [pfStatus, setPfStatus] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [viewId, setViewId] = useState<string | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [editRow, setEditRow] = useState<PlanFeatureRow | null>(null)
  const [editForm, setEditForm] = useState({ sku: '', status: 'active', notes: '' })

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    plan_id: '',
    feature_id: '',
    sku: '',
    status: 'active',
    notes: '',
  })

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<PlanFeatureRow[]>('/api/v1/catalog/plan_feature/list', {
        query: {
          plan_id: planId || undefined,
          feature_id: featureId || undefined,
          sku: sku || undefined,
          plan_feature_status: pfStatus || undefined,
        },
      }),
    [planId, featureId, sku, pfStatus],
  )

  const rows = data ?? []
  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(rows)


  const openView = async (id: string) => {
    setViewId(id)
    setViewData(null)
    setViewLoading(true)
    setErr('')
    try {
      setViewData(await apiRequest(`/api/v1/catalog/plan_feature/${id}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewId(null)
    } finally {
      setViewLoading(false)
    }
  }

  const openEdit = (row: PlanFeatureRow) => {
    setEditRow(row)
    setEditForm({ sku: row.sku, status: row.status, notes: '' })
    setErr('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRow) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/catalog/plan_feature/${editRow.plan_feature_id}`, {
        method: 'PUT',
        body: { sku: editForm.sku, status: editForm.status, notes: editForm.notes || null },
      })
      setMsg('Plan feature updated.')
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
      await apiRequest('/api/v1/catalog/plan_feature/create', {
        method: 'POST',
        body: { ...createForm, notes: createForm.notes || null },
      })
      setMsg('Plan feature created.')
      setShowCreate(false)
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleDelete = async (row: PlanFeatureRow) => {
    if (!confirm(`Delete plan feature ${row.sku}?`)) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/catalog/plan_feature/${row.plan_feature_id}`, { method: 'DELETE' })
      setMsg('Plan feature deleted.')
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  return (
    <>
      <h1 className="page-title">Plan Features</h1>
      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>Create plan feature</button>
      </div>
      <div className="filters">
        <label>Plan ID <input value={planId} onChange={(e) => setPlanId(e.target.value)} /></label>
        <label>Feature ID <input value={featureId} onChange={(e) => setFeatureId(e.target.value)} /></label>
        <label>SKU <input value={sku} onChange={(e) => setSku(e.target.value)} /></label>
        <label>
          Status
          <select value={pfStatus} onChange={(e) => setPfStatus(e.target.value)}>
            <option value="">All</option>
            {CATALOG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
                <th>plan_feature_id</th><th>plan_name</th><th>feature_name</th><th>sku</th><th>status</th><th>actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={row.plan_feature_id}>
                  <td>
                    <button type="button" className="id-link" onClick={() => void openView(row.plan_feature_id)}>
                      {row.plan_feature_id.slice(0, 8)}…
                    </button>
                  </td>
                  <td>{row.plan_name}</td>
                  <td>{row.feature_name}</td>
                  <td>{row.sku}</td>
                  <td>{row.status}</td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(row)}>Edit</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => void handleDelete(row)}>Delete</button>
                  </td>
                </tr>
              ))}
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
        <Modal title="Create plan feature" onClose={() => setShowCreate(false)}>
          <form className="inline-form" onSubmit={(e) => void handleCreate(e)}>
            <div className="form-field"><label>Plan ID</label><input value={createForm.plan_id} onChange={(e) => setCreateForm({ ...createForm, plan_id: e.target.value })} required /></div>
            <div className="form-field"><label>Feature ID</label><input value={createForm.feature_id} onChange={(e) => setCreateForm({ ...createForm, feature_id: e.target.value })} required /></div>
            <div className="form-field"><label>SKU</label><input value={createForm.sku} onChange={(e) => setCreateForm({ ...createForm, sku: e.target.value })} required /></div>
            <div className="form-field">
              <label>Status</label>
              <select value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}>
                {CATALOG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Notes</label><input value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} /></div>
            <button type="submit" className="btn btn-primary">Create</button>
          </form>
        </Modal>
      )}
      {editRow && (
        <Modal title={`Edit — ${editRow.sku}`} onClose={() => setEditRow(null)}>
          <form className="inline-form" onSubmit={(e) => void handleEdit(e)}>
            <div className="form-field"><label>SKU</label><input value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} /></div>
            <div className="form-field">
              <label>Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                {CATALOG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Notes</label><input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
            <button type="submit" className="btn btn-primary">Save</button>
          </form>
        </Modal>
      )}
      {viewId && (
        <Modal title="Plan feature details" onClose={() => setViewId(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
    </>
  )
}
