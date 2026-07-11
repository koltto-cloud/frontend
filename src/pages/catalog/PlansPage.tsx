import { useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
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

export default function PlansPage() {
  const [name, setName] = useState('')
  const [planType, setPlanType] = useState('')
  const [planStatus, setPlanStatus] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

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

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<PlanRow[]>('/api/v1/catalog/plan/list', {
        query: { name, plan_type: planType, plan_status: planStatus },
      }),
    [name, planType, planStatus],
  )

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
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  return (
    <>
      <h1 className="page-title">Plans</h1>
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
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>plan_id</th>
                <th>plan_type</th>
                <th>name</th>
                <th>description</th>
                <th>price</th>
                <th>status</th>
                <th>actions</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((row) => (
                <tr key={row.plan_id}>
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
              ))}
            </tbody>
          </table>
        </div>
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
      {viewId && (
        <Modal title="Plan details" onClose={() => setViewId(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
    </>
  )
}
