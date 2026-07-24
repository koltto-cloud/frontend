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

/** Providers that can be created today. GCP lights up when its API lands. */
const CREATABLE_CLOUDS: { value: CloudProvider; label: string; enabled: boolean }[] = [
  { value: 'oci', label: 'Oracle Cloud (OCI)', enabled: true },
  { value: 'aws', label: 'Amazon Web Services (AWS)', enabled: true },
  { value: 'gcp', label: 'Google Cloud (GCP)', enabled: false },
]

const MANAGEABLE_CLOUDS = new Set<CloudProvider>(['oci', 'aws'])

const EMPTY_OCI_CREATE = {
  name: '',
  description: '',
  tenancy: '',
  user: '',
  fingerprint: '',
  key_content: '',
  passphrase: '',
  region: 'us-ashburn-1',
  /** Comma-separated; empty → backend defaults to [region]. */
  sync_regions: '',
}

const EMPTY_AWS_CREATE = {
  name: '',
  description: '',
  account_id: '',
  access_key_id: '',
  secret_access_key: '',
  region: 'us-east-1',
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
  const [ociCreateForm, setOciCreateForm] = useState(EMPTY_OCI_CREATE)
  const [awsCreateForm, setAwsCreateForm] = useState(EMPTY_AWS_CREATE)

  const [editRow, setEditRow] = useState<ConnectionRow | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    region: '',
    sync_regions: '',
  })

  const listBase = companyId ? `/api/v1/cloud/connections/${companyId}` : null
  const ociBase = companyId ? `/api/v1/cloud/oci/connection/${companyId}/connections` : null
  const awsBase = companyId ? `/api/v1/cloud/aws/connection/${companyId}/connections` : null
  const tenancySyncBase = companyId
    ? `/api/v1/cloud/oci/tenancy/${companyId}/connections`
    : null

  const providerBase = (cloud: CloudProvider) => {
    if (cloud === 'oci') return ociBase
    if (cloud === 'aws') return awsBase
    return null
  }

  const { data, error, loading, reload } = useAsyncData(
    () => (listBase ? apiRequest<ConnectionRow[]>(listBase) : Promise.resolve([])),
    [listBase],
  )

  const rows = data ?? []
  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(rows)

  const openView = async (row: ConnectionRow) => {
    const base = providerBase(row.cloud)
    if (!base || !MANAGEABLE_CLOUDS.has(row.cloud)) return
    setViewId(row.connection_id)
    setViewData(null)
    setViewLoading(true)
    setErr('')
    try {
      setViewData(await apiRequest(`${base}/${row.connection_id}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewId(null)
    } finally {
      setViewLoading(false)
    }
  }

  const parseSyncRegions = (raw: string): string[] | undefined => {
    const parts = raw
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)
    return parts.length ? parts : undefined
  }

  const openEdit = async (row: ConnectionRow) => {
    if (!MANAGEABLE_CLOUDS.has(row.cloud)) return
    setEditRow(row)
    setEditForm({
      name: row.name,
      description: row.description ?? '',
      region: row.region ?? '',
      sync_regions: '',
    })
    setErr('')
    if (row.cloud === 'oci' && ociBase) {
      try {
        const detail = await apiRequest<{ sync_regions?: string[] }>(
          `${ociBase}/${row.connection_id}`,
        )
        setEditForm((prev) => ({
          ...prev,
          sync_regions: (detail.sync_regions ?? []).join(', '),
        }))
      } catch {
        // Edit still works with home region alone if detail fetch fails.
      }
    }
  }

  const resetCreateForms = () => {
    setOciCreateForm(EMPTY_OCI_CREATE)
    setAwsCreateForm(EMPTY_AWS_CREATE)
    setCreateCloud('oci')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    const base = providerBase(createCloud)
    if (!base || !MANAGEABLE_CLOUDS.has(createCloud)) {
      setErr(`${CLOUD_LABEL[createCloud]} connections are not available yet.`)
      return
    }
    setErr('')
    setMsg('')
    try {
      const ociSyncRegions = parseSyncRegions(ociCreateForm.sync_regions)
      const body =
        createCloud === 'oci'
          ? {
              name: ociCreateForm.name,
              description: ociCreateForm.description || null,
              tenancy: ociCreateForm.tenancy,
              user: ociCreateForm.user,
              fingerprint: ociCreateForm.fingerprint,
              key_content: ociCreateForm.key_content,
              passphrase: ociCreateForm.passphrase || null,
              region: ociCreateForm.region,
              company_id: companyId,
              ...(ociSyncRegions ? { sync_regions: ociSyncRegions } : {}),
            }
          : {
              ...awsCreateForm,
              company_id: companyId,
              description: awsCreateForm.description || null,
            }

      const created = await apiRequest<ConnectionRow>(base, {
        method: 'POST',
        body,
      })
      setMsg('Connection created.')
      setShowCreate(false)
      resetCreateForms()
      void reload()
      await refreshSession()

      if (createCloud === 'oci' && tenancySyncBase) {
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
      } else {
        setMsg(`Connection "${created.name}" created.`)
      }
    } catch (e) {
      setErr(formatApiError(e))
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRow || !MANAGEABLE_CLOUDS.has(editRow.cloud)) return
    const base = providerBase(editRow.cloud)
    if (!base) return
    setErr('')
    setMsg('')
    try {
      const body: Record<string, unknown> = {
        name: editForm.name,
        description: editForm.description || null,
        region: editForm.region,
      }
      if (editRow.cloud === 'oci') {
        const regions = parseSyncRegions(editForm.sync_regions)
        body.sync_regions = regions ?? [editForm.region].filter(Boolean)
      }
      await apiRequest(`${base}/${editRow.connection_id}`, {
        method: 'PUT',
        body,
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
    const base = providerBase(row.cloud)
    if (!base || !MANAGEABLE_CLOUDS.has(row.cloud)) return
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
        lead="Cloud account connections for this company. OCI and AWS are available; GCP will appear here when its connector ships."
        helpTitle="About Connections"
        help={connectionsHelp}
      />

      <div className="toolbar">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            resetCreateForms()
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
                {pageItems.map((row) => {
                  const manageable = MANAGEABLE_CLOUDS.has(row.cloud)
                  return (
                    <tr key={`${row.cloud}-${row.connection_id}`}>
                      <td>
                        <span className="cloud-badge">{CLOUD_LABEL[row.cloud] ?? row.cloud}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="id-link"
                          onClick={() => void openView(row)}
                          disabled={!manageable}
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
                        {manageable ? (
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
                  )
                })}
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

            {createCloud === 'oci' && (
              <>
                {(['name', 'tenancy', 'user', 'fingerprint', 'region'] as const).map((field) => (
                  <div key={field} className="form-field">
                    <label>{field}</label>
                    <input
                      value={ociCreateForm[field]}
                      onChange={(e) =>
                        setOciCreateForm({ ...ociCreateForm, [field]: e.target.value })
                      }
                      required
                    />
                  </div>
                ))}
                <div className="form-field">
                  <label>description (optional)</label>
                  <input
                    value={ociCreateForm.description}
                    onChange={(e) =>
                      setOciCreateForm({ ...ociCreateForm, description: e.target.value })
                    }
                  />
                </div>
                <div className="form-field">
                  <label>key_content</label>
                  <textarea
                    rows={4}
                    value={ociCreateForm.key_content}
                    onChange={(e) =>
                      setOciCreateForm({ ...ociCreateForm, key_content: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-field">
                  <label>passphrase (optional)</label>
                  <input
                    type="password"
                    value={ociCreateForm.passphrase}
                    onChange={(e) =>
                      setOciCreateForm({ ...ociCreateForm, passphrase: e.target.value })
                    }
                  />
                </div>
                <div className="form-field">
                  <label>sync_regions (optional, comma-separated)</label>
                  <input
                    value={ociCreateForm.sync_regions}
                    onChange={(e) =>
                      setOciCreateForm({ ...ociCreateForm, sync_regions: e.target.value })
                    }
                    placeholder="us-ashburn-1, us-phoenix-1"
                  />
                </div>
              </>
            )}

            {createCloud === 'aws' && (
              <>
                <div className="form-field">
                  <label>name</label>
                  <input
                    value={awsCreateForm.name}
                    onChange={(e) => setAwsCreateForm({ ...awsCreateForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>account_id</label>
                  <input
                    value={awsCreateForm.account_id}
                    onChange={(e) =>
                      setAwsCreateForm({ ...awsCreateForm, account_id: e.target.value })
                    }
                    inputMode="numeric"
                    pattern="[0-9]{12}"
                    maxLength={12}
                    placeholder="12-digit AWS account id"
                    required
                  />
                </div>
                <div className="form-field">
                  <label>access_key_id</label>
                  <input
                    value={awsCreateForm.access_key_id}
                    onChange={(e) =>
                      setAwsCreateForm({ ...awsCreateForm, access_key_id: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-field">
                  <label>secret_access_key</label>
                  <input
                    type="password"
                    value={awsCreateForm.secret_access_key}
                    onChange={(e) =>
                      setAwsCreateForm({ ...awsCreateForm, secret_access_key: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-field">
                  <label>region</label>
                  <input
                    value={awsCreateForm.region}
                    onChange={(e) =>
                      setAwsCreateForm({ ...awsCreateForm, region: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-field">
                  <label>description (optional)</label>
                  <input
                    value={awsCreateForm.description}
                    onChange={(e) =>
                      setAwsCreateForm({ ...awsCreateForm, description: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            {createCloud === 'gcp' ? (
              <p className="empty" style={{ margin: 0 }}>
                GCP connections are not available yet. Choose OCI or AWS to create a connection
                today.
              </p>
            ) : (
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
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
            {editRow.cloud === 'oci' && (
              <div className="form-field">
                <label>sync_regions (comma-separated)</label>
                <input
                  value={editForm.sync_regions}
                  onChange={(e) => setEditForm({ ...editForm, sync_regions: e.target.value })}
                  placeholder="us-ashburn-1, us-phoenix-1"
                />
              </div>
            )}
            <p className="empty" style={{ margin: 0 }}>
              {editRow.cloud === 'aws'
                ? 'Credentials (access key / secret) cannot be updated via this endpoint.'
                : 'Credentials (user, fingerprint, key) cannot be updated via this endpoint. Home region is for Identity/Usage; sync_regions drives multi-region compute sync.'}
            </p>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setEditRow(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
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
