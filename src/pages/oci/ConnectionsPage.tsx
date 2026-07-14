import { useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useClientPagination } from '@/hooks/useClientPagination'
import { Alert } from '@/components/Alert'
import PaginationControls from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'

interface ConnectionRow {
  connection_id: string
  company_id: string
  name: string
  description?: string | null
  user: string
  fingerprint: string
  tenancy: string
  region: string
  created_at?: string
  updated_at?: string
}

const EMPTY_CREATE = {
  name: '',
  description: '',
  tenancy: '',
  user: '',
  fingerprint: '',
  key_content: '',
  passphrase: '',
  region: 'us-ashburn-1',
}

export default function ConnectionsPage() {
  const { activeCompany, refreshSession } = useAuth()
  const companyId = activeCompany?.company_id ?? ''

  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [viewId, setViewId] = useState<string | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE)

  const [editRow, setEditRow] = useState<ConnectionRow | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', region: '' })

  const base = companyId ? `/api/v1/cloud/oci/connection/${companyId}/connections` : null

  const { data, error, loading, reload } = useAsyncData(
    () => (base ? apiRequest<ConnectionRow[]>(base) : Promise.resolve([])),
    [base],
  )

  const rows = data ?? []
  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(rows)


  const openView = async (connectionId: string) => {
    if (!base) return
    setViewId(connectionId)
    setViewData(null)
    setViewLoading(true)
    setErr('')
    try {
      setViewData(await apiRequest(`${base}/${connectionId}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewId(null)
    } finally {
      setViewLoading(false)
    }
  }

  const openEdit = (row: ConnectionRow) => {
    setEditRow(row)
    setEditForm({
      name: row.name,
      description: row.description ?? '',
      region: row.region,
    })
    setErr('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!base || !companyId) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(base, {
        method: 'POST',
        body: {
          ...createForm,
          company_id: companyId,
          description: createForm.description || null,
          passphrase: createForm.passphrase || null,
        },
      })
      setMsg('Connection created.')
      setShowCreate(false)
      setCreateForm(EMPTY_CREATE)
      void reload()
      await refreshSession()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!base || !editRow) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`${base}/${editRow.connection_id}`, {
        method: 'PUT',
        body: {
          name: editForm.name,
          description: editForm.description || null,
          region: editForm.region,
        },
      })
      setMsg('Connection updated.')
      setEditRow(null)
      void reload()
      await refreshSession()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleDelete = async (row: ConnectionRow) => {
    if (!base) return
    if (!confirm(`Delete connection "${row.name}"?`)) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`${base}/${row.connection_id}`, { method: 'DELETE' })
      setMsg('Connection deleted.')
      void reload()
      await refreshSession()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  if (!companyId) {
    return (
      <>
        <h1 className="page-title">OCI Connections</h1>
        <p className="empty">Select a company from the top bar.</p>
      </>
    )
  }

  return (
    <>
      <h1 className="page-title">OCI Connections</h1>

      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          Create connection
        </button>
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
                <th>Connection ID</th>
                <th>Name</th>
                <th>Tenancy</th>
                <th>User</th>
                <th>Region</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={row.connection_id}>
                  <td>
                    <button
                      type="button"
                      className="id-link"
                      onClick={() => void openView(row.connection_id)}
                    >
                      {row.connection_id.slice(0, 8)}…
                    </button>
                  </td>
                  <td>{row.name}</td>
                  <td>{row.tenancy?.slice(0, 20)}…</td>
                  <td>{row.user?.slice(0, 20)}…</td>
                  <td>{row.region}</td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void handleDelete(row)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <p className="empty">No connections.</p>}
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
        <Modal title="Create connection" onClose={() => setShowCreate(false)} wide>
          <form className="inline-form" onSubmit={(e) => void handleCreate(e)}>
            {(['name', 'tenancy', 'user', 'fingerprint', 'region'] as const).map((field) => (
              <div key={field} className="form-field">
                <label>{field}</label>
                <input
                  value={createForm[field]}
                  onChange={(e) => setCreateForm({ ...createForm, [field]: e.target.value })}
                  required
                />
              </div>
            ))}
            <div className="form-field">
              <label>description (optional)</label>
              <input
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>key_content</label>
              <textarea
                rows={4}
                value={createForm.key_content}
                onChange={(e) => setCreateForm({ ...createForm, key_content: e.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label>passphrase (optional)</label>
              <input
                type="password"
                value={createForm.passphrase}
                onChange={(e) => setCreateForm({ ...createForm, passphrase: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </form>
        </Modal>
      )}

      {editRow && (
        <Modal title={`Edit connection — ${editRow.name}`} onClose={() => setEditRow(null)}>
          <form className="inline-form" onSubmit={(e) => void handleEdit(e)}>
            <div className="form-field">
              <label>name</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>description</label>
              <input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>region</label>
              <input
                value={editForm.region}
                onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
              />
            </div>
            <p className="empty" style={{ margin: 0 }}>
              Credentials (user, fingerprint, key) cannot be updated via this endpoint.
            </p>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </form>
        </Modal>
      )}

      {viewId && (
        <Modal title="Connection details" onClose={() => setViewId(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
    </>
  )
}
