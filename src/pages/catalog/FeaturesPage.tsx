import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useClientPagination } from '@/hooks/useClientPagination'
import { Alert } from '@/components/Alert'
import PaginationControls from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'
import { CATALOG_STATUSES } from '@/pages/catalog/constants'

interface FeatureRow {
  feature_id: string
  name: string
  description: string
  price: number
  status: string
}

export default function FeaturesPage() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [featureStatus, setFeatureStatus] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [viewId, setViewId] = useState<string | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [editRow, setEditRow] = useState<FeatureRow | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', status: 'active', notes: '' })

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', price: '', notes: '' })

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<FeatureRow[]>('/api/v1/catalog/feature/list', {
        query: { name, feature_status: featureStatus },
      }),
    [name, featureStatus],
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
      setViewData(await apiRequest(`/api/v1/catalog/feature/${id}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewId(null)
    } finally {
      setViewLoading(false)
    }
  }

  const openEdit = (row: FeatureRow) => {
    setEditRow(row)
    setEditForm({ name: row.name, description: row.description, price: String(row.price), status: row.status, notes: '' })
    setErr('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRow) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/catalog/feature/${editRow.feature_id}`, {
        method: 'PUT',
        body: {
          name: editForm.name,
          description: editForm.description,
          price: Number(editForm.price),
          status: editForm.status,
          notes: editForm.notes || null,
        },
      })
      setMsg('Service updated.')
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
      await apiRequest('/api/v1/catalog/feature/create', {
        method: 'POST',
        body: { ...createForm, price: Number(createForm.price), notes: createForm.notes || null },
      })
      setMsg('Service created.')
      setShowCreate(false)
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleDelete = async (row: FeatureRow) => {
    if (!confirm(t('modals.deleteServiceConfirm', { name: row.name }))) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/catalog/feature/${row.feature_id}`, { method: 'DELETE' })
      setMsg('Service deleted.')
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  return (
    <>
      <h1 className="page-title">Services</h1>
      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('modals.createService')}</button>
      </div>
      <div className="filters">
        <label>Name <input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>
          Status
          <select value={featureStatus} onChange={(e) => setFeatureStatus(e.target.value)}>
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
                <th>Service ID</th><th>Name</th><th>Description</th><th>Price</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={row.feature_id}>
                  <td>
                    <button type="button" className="id-link" onClick={() => void openView(row.feature_id)}>
                      {row.feature_id.slice(0, 8)}…
                    </button>
                  </td>
                  <td>{row.name}</td>
                  <td>{row.description}</td>
                  <td>{row.price}</td>
                  <td>{row.status}</td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(row)}>Edit</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => void handleDelete(row)}>{t('common.delete')}</button>
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
        <Modal title={t('modals.createService')} onClose={() => setShowCreate(false)}>
          <form className="inline-form" onSubmit={(e) => void handleCreate(e)}>
            {(['name', 'description', 'price', 'notes'] as const).map((f) => (
              <div key={f} className="form-field">
                <label>{f}</label>
                <input value={createForm[f]} onChange={(e) => setCreateForm({ ...createForm, [f]: e.target.value })} required={f !== 'notes'} />
              </div>
            ))}
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
        <Modal title={`Edit service — ${editRow.name}`} onClose={() => setEditRow(null)}>
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
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setEditRow(null)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">{t('common.saveShort')}</button>
            </div>
          </form>
        </Modal>
      )}
      {viewId && (
        <Modal title={t('modals.serviceDetails')} onClose={() => setViewId(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
    </>
  )
}
