import { useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useClientPagination } from '@/hooks/useClientPagination'
import { Alert } from '@/components/Alert'
import PaginationControls from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'

interface CompanyRow {
  company_id: string
  name: string
  status: string
  schema_revision: string | null
  expected_schema_revision: string
  schema_up_to_date: boolean
}

const COMPANY_STATUSES = ['active', 'inactive', 'pending'] as const
const INTEGRATIONS = ['oci', 'aws', 'gcp'] as const

export default function CompaniesPage() {
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')
  const [integration, setIntegration] = useState<string>('oci')

  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [viewId, setViewId] = useState<string | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [editCompany, setEditCompany] = useState<CompanyRow | null>(null)
  const [editForm, setEditForm] = useState({ name: '', status: 'active' })

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<CompanyRow[]>('/api/v1/identity/companies/list', {
        query: { name, company_status: status, integration },
      }),
    [name, status, integration],
  )

  const rows = data ?? []
  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(rows)

  const expectedRev = rows[0]?.expected_schema_revision

  const openView = async (companyId: string) => {
    setViewId(companyId)
    setViewData(null)
    setViewLoading(true)
    setErr('')
    try {
      const detail = await apiRequest<Record<string, unknown>>(
        `/api/v1/identity/companies/${companyId}`,
      )
      setViewData(detail)
    } catch (e) {
      setErr(formatApiError(e))
      setViewId(null)
    } finally {
      setViewLoading(false)
    }
  }

  const openEdit = (row: CompanyRow) => {
    setEditCompany(row)
    setEditForm({ name: row.name, status: row.status })
    setErr('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCompany) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/identity/companies/${editCompany.company_id}`, {
        method: 'PUT',
        body: editForm,
      })
      setMsg('Company updated.')
      setEditCompany(null)
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
      await apiRequest('/api/v1/identity/companies/create', {
        method: 'POST',
        body: { name: createName },
      })
      setMsg('Company created.')
      setShowCreate(false)
      setCreateName('')
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleDelete = async (row: CompanyRow) => {
    if (!confirm(`Delete company "${row.name}"?`)) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/identity/companies/${row.company_id}`, { method: 'DELETE' })
      setMsg(`Company "${row.name}" deleted.`)
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleDeploy = async (row: CompanyRow) => {
    setErr('')
    setMsg('')
    try {
      await apiRequest<Record<string, unknown>>(
        `/api/v1/identity/companies/${row.company_id}/deploy/${integration}`,
        { method: 'POST' },
      )
      setMsg(`Deployed ${integration} for "${row.name}".`)
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleDeployAll = async () => {
    if (!confirm(`Deploy ${integration} for ALL active companies?`)) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/identity/companies/deploy-all/${integration}`, { method: 'POST' })
      setMsg(`Bulk deploy ${integration} finished.`)
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  return (
    <>
      <h1 className="page-title">Companies</h1>

      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          Create company
        </button>
        <label>
          Integration
          <select value={integration} onChange={(e) => setIntegration(e.target.value)}>
            {INTEGRATIONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" onClick={() => void handleDeployAll()}>
          Deploy all
        </button>
        {expectedRev && (
          <span title="alembic_tenant head in this API build">
            Expected schema: {expectedRev}
          </span>
        )}
      </div>

      <div className="filters">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="search" />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {COMPANY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={() => void reload()}>
          Search
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
                <th>Company ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Current schema</th>
                <th>Deploy</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={row.company_id}>
                  <td>
                    <button
                      type="button"
                      className="id-link"
                      onClick={() => void openView(row.company_id)}
                    >
                      {row.company_id.slice(0, 8)}…
                    </button>
                  </td>
                  <td>{row.name}</td>
                  <td>{row.status}</td>
                  <td title={integration}>{row.schema_revision ?? '—'}</td>
                  <td>{row.schema_up_to_date ? 'Up to date' : 'Needs deploy'}</td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => void handleDeploy(row)}>
                      Deploy
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => void handleDelete(row)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <p className="empty">No companies found.</p>}
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
        <Modal title="Create company" onClose={() => setShowCreate(false)}>
          <form className="inline-form" onSubmit={(e) => void handleCreate(e)}>
            <div className="form-field">
              <label>Name</label>
              <input value={createName} onChange={(e) => setCreateName(e.target.value)} required />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editCompany && (
        <Modal title={`Edit company — ${editCompany.name}`} onClose={() => setEditCompany(null)}>
          <form className="inline-form" onSubmit={(e) => void handleEdit(e)}>
            <div className="form-field">
              <label>Name</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                {COMPANY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewId && (
        <Modal title="Company details" onClose={() => setViewId(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
    </>
  )
}
