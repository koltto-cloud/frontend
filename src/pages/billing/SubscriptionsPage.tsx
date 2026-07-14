import { useState } from 'react'
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

export default function SubscriptionsPage() {
  const [companyId, setCompanyId] = useState('')
  const [subStatus, setSubStatus] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [viewId, setViewId] = useState<string | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const [editRow, setEditRow] = useState<SubscriptionRow | null>(null)
  const [editForm, setEditForm] = useState({ status: 'active', start_date: '', end_date: '' })

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    company_id: '',
    plan_id: '',
    start_date: '',
    end_date: '',
  })

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<SubscriptionRow[]>('/api/v1/billing/subscription/list', {
        query: { company_id: companyId || undefined, subscription_status: subStatus || undefined },
      }),
    [companyId, subStatus],
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
      setViewData(await apiRequest(`/api/v1/billing/subscription/${id}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewId(null)
    } finally {
      setViewLoading(false)
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
      await apiRequest('/api/v1/billing/subscription/create', {
        method: 'POST',
        body: {
          company_id: createForm.company_id,
          plan_id: createForm.plan_id,
          start_date: fromDatetimeLocal(createForm.start_date),
          end_date: createForm.end_date ? fromDatetimeLocal(createForm.end_date) : null,
        },
      })
      setMsg('Subscription created.')
      setShowCreate(false)
      void reload()
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  return (
    <>
      <h1 className="page-title">Subscriptions</h1>
      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>Create subscription</button>
      </div>
      <p className="alert alert-info">
        Creating a subscription also creates its subscription items automatically (one per plan feature on the plan).
      </p>
      <div className="filters">
        <label>Company ID <input value={companyId} onChange={(e) => setCompanyId(e.target.value)} /></label>
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
                <th>Subscription ID</th><th>Company</th><th>Status</th><th>Start date</th><th>End date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={row.subscription_id}>
                  <td>
                    <button type="button" className="id-link" onClick={() => void openView(row.subscription_id)}>
                      {row.subscription_id.slice(0, 8)}…
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
        <Modal title="Create subscription" onClose={() => setShowCreate(false)}>
          <form className="inline-form" onSubmit={(e) => void handleCreate(e)}>
            <div className="form-field"><label>Company ID</label><input value={createForm.company_id} onChange={(e) => setCreateForm({ ...createForm, company_id: e.target.value })} required /></div>
            <div className="form-field"><label>Plan ID</label><input value={createForm.plan_id} onChange={(e) => setCreateForm({ ...createForm, plan_id: e.target.value })} required /></div>
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
    </>
  )
}
