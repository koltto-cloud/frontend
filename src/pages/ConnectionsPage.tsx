import { useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useClientPagination } from '@/hooks/useClientPagination'
import { Alert } from '@/components/Alert'
import PaginationControls from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'
import PageHeader from '@/components/PageHeader'
import { connectionsHelp } from '@/content/pageHelp'

type CloudProvider = 'oci' | 'aws' | 'gcp'

interface ConnectionRow {
  cloud: CloudProvider
  connection_id: string
  company_id: string
  name: string
  description?: string | null
  region?: string | null
  account_ref?: string | null
  user?: string | null
  fingerprint?: string | null
  tenancy?: string | null
  created_at?: string
  updated_at?: string
}

const CLOUD_LABEL: Record<CloudProvider, string> = {
  oci: 'OCI',
  aws: 'AWS',
  gcp: 'GCP',
}

/** Providers that can be created today. AWS/GCP light up when their APIs land. */
const CREATABLE_CLOUDS: { value: CloudProvider; label: string; enabled: boolean }[] = [
  { value: 'oci', label: 'Oracle Cloud (OCI)', enabled: true },
  { value: 'aws', label: 'Amazon Web Services (AWS)', enabled: false },
  { value: 'gcp', label: 'Google Cloud (GCP)', enabled: false },
]

const EMPTY_OCI_CREATE = {
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
  const [createCloud, setCreateCloud] = useState<CloudProvider>('oci')
  const [createForm, setCreateForm] = useState(EMPTY_OCI_CREATE)

  const [editRow, setEditRow] = useState<ConnectionRow | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', region: '' })

  const listBase = companyId ? `/api/v1/cloud/connections/${companyId}` : null
  const ociBase = companyId ? `/api/v1/cloud/oci/connection/${companyId}/connections` : null
  const tenancySyncBase = companyId
    ? `/api/v1/cloud/oci/tenancy/${companyId}/connections`
    : null

  const { data, error, loading, reload } = useAsyncData(
    () => (listBase ? apiRequest<ConnectionRow[]>(listBase) : Promise.resolve([])),
    [listBase],
  )

  const rows = data ?? []
  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(rows)

  const openView = async (row: ConnectionRow) => {
    if (row.cloud !== 'oci' || !ociBase) return
    setViewId(row.connection_id)
    setViewData(null)
    setViewLoading(true)
    setErr('')
    try {
      setViewData(await apiRequest(`${ociBase}/${row.connection_id}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewId(null)
    } finally {
      setViewLoading(false)
    }
  }

  const openEdit = (row: ConnectionRow) => {
    if (row.cloud !== 'oci') return
    setEditRow(row)
    setEditForm({
      name: row.name,
      description: row.description ?? '',
      region: row.region ?? '',
    })
    setErr('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ociBase || !companyId) return
    if (createCloud !== 'oci') {
      setErr(`${CLOUD_LABEL[createCloud]} connections are not available yet.`)
      return
    }
    setErr('')
    setMsg('')
    try {
      const created = await apiRequest<ConnectionRow>(ociBase, {
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
      setCreateForm(EMPTY_OCI_CREATE)
      setCreateCloud('oci')
      void reload()
      await refreshSession()
      if (tenancySyncBase) {
        try {
          await apiRequest(`${tenancySyncBase}/${created.connection_id}/tenancy/sync`, {
            method: 'POST',
          })
          setMsg(`Connection "${created.name}" created and tenancy synced.`)
        } catch (tenancyErr) {
          setErr(
            `Connection created, but tenancy sync failed: ${formatApiError(tenancyErr)}. Sync compartments will retry tenancy automatically.`,
          )
        }
      }
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ociBase || !editRow || editRow.cloud !== 'oci') return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`${ociBase}/${editRow.connection_id}`, {
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
    if (row.cloud !== 'oci' || !ociBase) return
    if (!confirm(`Delete connection "${row.name}"?`)) return
    setErr('')
    setMsg('')
    try {
      await apiRequest(`${ociBase}/${row.connection_id}`, { method: 'DELETE' })
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
        <PageHeader
          title="Connections"
          helpTitle="About Connections"
          help={connectionsHelp}
        />
        <p className="empty">Select a company from the top bar.</p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Connections"
        lead="Cloud account connections for this company. OCI is available today; AWS and GCP will appear here when their connectors ship."
        helpTitle="About Connections"
        help={connectionsHelp}
      />

      <div className="toolbar">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setCreateCloud('oci')
            setShowCreate(true)
          }}
        >
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
                  <th>Cloud</th>
                  <th>Name</th>
                  <th>Account</th>
                  <th>Region</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => (
                  <tr key={`${row.cloud}-${row.connection_id}`}>
                    <td>
                      <span className="cloud-badge">{CLOUD_LABEL[row.cloud] ?? row.cloud}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="id-link"
                        onClick={() => void openView(row)}
                        disabled={row.cloud !== 'oci'}
                      >
                        {row.name}
                      </button>
                    </td>
                    <td title={row.account_ref ?? row.tenancy ?? undefined}>
                      {(row.account_ref ?? row.tenancy)?.slice(0, 24) ?? '—'}
                      {(row.account_ref ?? row.tenancy) &&
                      (row.account_ref ?? row.tenancy)!.length > 24
                        ? '…'
                        : ''}
                    </td>
                    <td>{row.region ?? '—'}</td>
                    <td className="actions-cell">
                      {row.cloud === 'oci' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => openEdit(row)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => void handleDelete(row)}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="empty">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data ?? []).length === 0 && <p className="empty">No connections yet.</p>}
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
            <div className="form-field">
              <label>Cloud</label>
              <select
                value={createCloud}
                onChange={(e) => setCreateCloud(e.target.value as CloudProvider)}
              >
                {CREATABLE_CLOUDS.map((c) => (
                  <option key={c.value} value={c.value} disabled={!c.enabled}>
                    {c.label}
                    {c.enabled ? '' : ' — coming soon'}
                  </option>
                ))}
              </select>
            </div>

            {createCloud === 'oci' ? (
              <>
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
              </>
            ) : (
              <p className="empty" style={{ margin: 0 }}>
                {CLOUD_LABEL[createCloud]} connections are not available yet. Choose OCI to create
                a connection today.
              </p>
            )}
          </form>
        </Modal>
      )}

      {editRow && (
        <Modal title={`Edit connection — ${editRow.name}`} onClose={() => setEditRow(null)}>
          <form className="inline-form" onSubmit={(e) => void handleEdit(e)}>
            <div className="form-field">
              <label>Cloud</label>
              <input value={CLOUD_LABEL[editRow.cloud]} disabled />
            </div>
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
