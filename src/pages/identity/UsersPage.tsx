import { useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useClientPagination } from '@/hooks/useClientPagination'
import { Alert } from '@/components/Alert'
import PaginationControls from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'

interface UserRow {
  user_id: string
  first_name: string
  last_name: string
  email: string
  user_type: string
  account_status: string
}

const USER_TYPES = ['customer', 'staff', 'super_admin'] as const
const ACCOUNT_STATUSES = ['active', 'inactive', 'pending', 'locked'] as const

export default function UsersPage() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [userType, setUserType] = useState('')
  const [accountStatus, setAccountStatus] = useState('')

  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [viewId, setViewId] = useState<string | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [editForm, setEditForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    user_type: 'customer',
    account_status: 'active',
  })

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ first_name: '', last_name: '', email: '' })

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<UserRow[]>('/api/v1/identity/users/list', {
        query: {
          email,
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
          account_status: accountStatus,
        },
      }),
    [email, firstName, lastName, userType, accountStatus],
  )

  const rows = data ?? []
  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(rows)


  const openView = async (userId: string) => {
    setViewId(userId)
    setViewData(null)
    setViewLoading(true)
    setErr('')
    try {
      const detail = await apiRequest<Record<string, unknown>>(`/api/v1/identity/users/${userId}`)
      setViewData(detail)
    } catch (e) {
      setErr(formatApiError(e))
      setViewId(null)
    } finally {
      setViewLoading(false)
    }
  }

  const openEdit = (row: UserRow) => {
    setEditUser(row)
    setEditForm({
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      user_type: row.user_type,
      account_status: row.account_status,
    })
    setErr('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/identity/users/admin/${editUser.user_id}`, {
        method: 'PUT',
        body: editForm,
      })
      setMsg('User updated.')
      setEditUser(null)
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
      await apiRequest('/api/v1/identity/users/create', { method: 'POST', body: createForm })
      setMsg('User created (invitation email sent if configured).')
      setShowCreate(false)
      setCreateForm({ first_name: '', last_name: '', email: '' })
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleForceReset = async (row: UserRow) => {
    if (!confirm(`Send password reset to ${row.email}?`)) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`/api/v1/auth/password-reset/force-reset/${row.user_id}`, { method: 'POST' })
      setMsg(`Password reset triggered for ${row.email}.`)
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  return (
    <>
      <h1 className="page-title">Users</h1>

      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          Create user
        </button>
      </div>

      <div className="filters">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="search" />
        </label>
        <label>
          First name
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label>
          Last name
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        <label>
          User type
          <select value={userType} onChange={(e) => setUserType(e.target.value)}>
            <option value="">All</option>
            {USER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Account status
          <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)}>
            <option value="">All</option>
            {ACCOUNT_STATUSES.map((s) => (
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
                <th>user_id</th>
                <th>email</th>
                <th>first_name</th>
                <th>last_name</th>
                <th>user_type</th>
                <th>account_status</th>
                <th>actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={row.user_id}>
                  <td>
                    <button type="button" className="id-link" onClick={() => void openView(row.user_id)}>
                      {row.user_id.slice(0, 8)}…
                    </button>
                  </td>
                  <td>{row.email}</td>
                  <td>{row.first_name}</td>
                  <td>{row.last_name}</td>
                  <td>{row.user_type}</td>
                  <td>{row.account_status}</td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => void handleForceReset(row)}>
                      Reset pwd
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <p className="empty">No users found.</p>}
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
        <Modal title="Create user" onClose={() => setShowCreate(false)}>
          <form className="inline-form" onSubmit={(e) => void handleCreate(e)}>
            <div className="form-field">
              <label>First name</label>
              <input
                value={createForm.first_name}
                onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label>Last name</label>
              <input
                value={createForm.last_name}
                onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editUser && (
        <Modal title={`Edit user — ${editUser.email}`} onClose={() => setEditUser(null)}>
          <form className="inline-form" onSubmit={(e) => void handleEdit(e)}>
            <div className="form-field">
              <label>Email</label>
              <input
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>First name</label>
              <input
                value={editForm.first_name}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Last name</label>
              <input
                value={editForm.last_name}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>User type</label>
              <select
                value={editForm.user_type}
                onChange={(e) => setEditForm({ ...editForm, user_type: e.target.value })}
              >
                {USER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Account status</label>
              <select
                value={editForm.account_status}
                onChange={(e) => setEditForm({ ...editForm, account_status: e.target.value })}
              >
                {ACCOUNT_STATUSES.map((s) => (
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
        <Modal title="User details" onClose={() => setViewId(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
    </>
  )
}
