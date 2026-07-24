import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useClientPagination } from '@/hooks/useClientPagination'
import { Alert } from '@/components/Alert'
import PaginationControls from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'

interface MembershipRow {
  user: { user_id: string; email: string; first_name: string; last_name: string }
  company: { company_id: string; name: string }
  role: string
  active: boolean
}

const ROLES = ['owner', 'admin', 'viewer'] as const

export default function MembershipsPage() {
  const { t } = useTranslation()
  const [role, setRole] = useState('')
  const [active, setActive] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [companyName, setCompanyName] = useState('')

  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [viewKey, setViewKey] = useState<{ userId: string; companyId: string } | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [editRow, setEditRow] = useState<MembershipRow | null>(null)
  const [editForm, setEditForm] = useState({ role: 'viewer', active: true })

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    user_id: '',
    company_id: '',
    role: 'viewer',
    active: true,
  })

  const { data: users } = useAsyncData(
    () => apiRequest<{ user_id: string; email: string; first_name: string; last_name: string }[]>(
      '/api/v1/identity/users/list',
    ),
    [],
  )
  const { data: companies } = useAsyncData(
    () => apiRequest<{ company_id: string; name: string }[]>('/api/v1/identity/companies/list'),
    [],
  )

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<MembershipRow[]>('/api/v1/identity/memberships/list', {
        query: {
          role: role || undefined,
          active: active === '' ? undefined : active === 'true',
          user_email: userEmail || undefined,
          company_name: companyName || undefined,
        },
      }),
    [role, active, userEmail, companyName],
  )

  const rows = data ?? []
  const userOptions = users ?? []
  const companyOptions = companies ?? []
  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(rows)


  const openView = async (userId: string, companyId: string) => {
    setViewKey({ userId, companyId })
    setViewData(null)
    setViewLoading(true)
    setErr('')
    try {
      const detail = await apiRequest<Record<string, unknown>>(
        `/api/v1/identity/memberships/${userId}/${companyId}`,
      )
      setViewData(detail)
    } catch (e) {
      setErr(formatApiError(e))
      setViewKey(null)
    } finally {
      setViewLoading(false)
    }
  }

  const openEdit = (row: MembershipRow) => {
    setEditRow(row)
    setEditForm({ role: row.role, active: row.active })
    setErr('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRow) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(
        `/api/v1/identity/memberships/${editRow.user.user_id}/${editRow.company.company_id}`,
        { method: 'PUT', body: editForm },
      )
      setMsg('Membership updated.')
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
      await apiRequest('/api/v1/identity/memberships/create', {
        method: 'POST',
        body: createForm,
      })
      setMsg('Membership created.')
      setShowCreate(false)
      setCreateForm({ user_id: '', company_id: '', role: 'viewer', active: true })
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleDelete = async (row: MembershipRow) => {
    if (
      !confirm(
        t('modals.removeMembershipConfirm', {
          email: row.user.email,
          company: row.company.name,
        }),
      )
    ) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(
        `/api/v1/identity/memberships/${row.user.user_id}/${row.company.company_id}`,
        { method: 'DELETE' },
      )
      setMsg('Membership removed.')
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  return (
    <>
      <h1 className="page-title">Memberships</h1>

      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          {t('modals.createMembership')}
        </button>
      </div>

      <div className="filters">
        <label>
          User email
          <input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="search" />
        </label>
        <label>
          Company name
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="search" />
        </label>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          Active
          <select value={active} onChange={(e) => setActive(e.target.value)}>
            <option value="">All</option>
            <option value="true">yes</option>
            <option value="false">no</option>
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
                <th>User ID</th>
                <th>User email</th>
                <th>Company</th>
                <th>Role</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={`${row.user.user_id}-${row.company.company_id}`}>
                  <td>
                    <button
                      type="button"
                      className="id-link"
                      onClick={() => void openView(row.user.user_id, row.company.company_id)}
                    >
                      {row.user.user_id.slice(0, 8)}…
                    </button>
                  </td>
                  <td>{row.user.email}</td>
                  <td>{row.company.name}</td>
                  <td>{row.role}</td>
                  <td>{row.active ? 'yes' : 'no'}</td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void handleDelete(row)}
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <p className="empty">No memberships found.</p>}
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
        <Modal title={t('modals.createMembership')} onClose={() => setShowCreate(false)}>
          <form className="inline-form" onSubmit={(e) => void handleCreate(e)}>
            <div className="form-field">
              <label>User</label>
              <select
                value={createForm.user_id}
                onChange={(e) => setCreateForm({ ...createForm, user_id: e.target.value })}
                required
              >
                <option value="">Select user…</option>
                {userOptions.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.email} ({u.first_name} {u.last_name})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Company</label>
              <select
                value={createForm.company_id}
                onChange={(e) => setCreateForm({ ...createForm, company_id: e.target.value })}
                required
              >
                <option value="">Select company…</option>
                {companyOptions.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Role</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>
                <input
                  type="checkbox"
                  checked={createForm.active}
                  onChange={(e) => setCreateForm({ ...createForm, active: e.target.checked })}
                />{' '}
                Active
              </label>
            </div>
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
        <Modal
          title={`Edit membership — ${editRow.user.email} @ ${editRow.company.name}`}
          onClose={() => setEditRow(null)}
        >
          <form className="inline-form" onSubmit={(e) => void handleEdit(e)}>
            <div className="form-field">
              <label>Role</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>
                <input
                  type="checkbox"
                  checked={editForm.active}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                />{' '}
                Active
              </label>
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

      {viewKey && (
        <Modal title={t('modals.membershipDetails')} onClose={() => setViewKey(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
    </>
  )
}
