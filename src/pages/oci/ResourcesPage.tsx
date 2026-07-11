import { useCallback, useEffect, useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { ociCompartmentsPath, useOciCompartments } from '@/hooks/useOciCompartments'
import CompartmentsTable from '@/components/CompartmentsTable'
import DataTable from '@/components/DataTable'
import { Alert } from '@/components/Alert'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'

const RESOURCE_TABS = [
  { key: 'compartments', label: 'Compartments', segment: 'compartment', resource: 'compartments' },
  { key: 'compute', label: 'Compute', segment: 'compute', resource: 'compute' },
  { key: 'block-storage', label: 'Block Storage', segment: 'block-storage', resource: 'block-storage' },
  { key: 'object-storage', label: 'Object Storage', segment: 'object-storage', resource: 'object-storage' },
  { key: 'file-storage', label: 'File Storage', segment: 'file-storage', resource: 'file-storage' },
  { key: 'load-balancer', label: 'Load Balancers', segment: 'load-balancer', resource: 'load-balancers' },
] as const

type TabKey = (typeof RESOURCE_TABS)[number]['key']

const ALL_COMPARTMENTS = ''

function resourceBase(companyId: string, connectionId: string, tab: (typeof RESOURCE_TABS)[number]) {
  return `/api/v1/cloud/oci/${tab.segment}/${companyId}/connections/${connectionId}/${tab.resource}`
}

export default function ResourcesPage() {
  const { activeCompany, connection } = useAuth()
  const [tab, setTab] = useState<TabKey>('compartments')
  const [compartmentFilter, setCompartmentFilter] = useState(ALL_COMPARTMENTS)
  const [actionError, setActionError] = useState('')

  const [viewId, setViewId] = useState<string | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id
  const tabConfig = RESOURCE_TABS.find((t) => t.key === tab)!

  const { compartments, error: compartmentsError, loading: compartmentsLoading, reload: reloadCompartments } =
    useOciCompartments(companyId, connectionId)

  const base =
    companyId && connectionId ? resourceBase(companyId, connectionId, tabConfig) : null

  const isResourceTab = tab !== 'compartments'

  const listKey = isResourceTab ? `${base}:${compartmentFilter}` : null

  const { data, error, loading, reload: reloadResources } = useAsyncData(
    () => {
      if (!base || !isResourceTab) return Promise.resolve([])
      const query: Record<string, string | number> = { limit: 200, offset: 0 }
      if (compartmentFilter) query.compartment_id = compartmentFilter
      return apiRequest<Record<string, unknown>[]>(base, { query })
    },
    [listKey],
  )

  useEffect(() => {
    if (!isResourceTab) setCompartmentFilter(ALL_COMPARTMENTS)
  }, [tab, isResourceTab])

  const openView = async (id: string) => {
    const viewBase =
      tab === 'compartments' && companyId && connectionId
        ? ociCompartmentsPath(companyId, connectionId)
        : base
    if (!viewBase) return
    setViewId(id)
    setViewData(null)
    setViewLoading(true)
    setActionError('')
    try {
      setViewData(await apiRequest(`${viewBase}/${encodeURIComponent(id)}`))
    } catch (err) {
      setActionError(formatApiError(err))
      setViewId(null)
    } finally {
      setViewLoading(false)
    }
  }

  const handleRowClick = (row: Record<string, unknown>) => {
    const id = String(row.resource_ocid ?? row.compartment_ocid ?? '')
    if (id) void openView(id)
  }

  const handleRefreshCompartments = useCallback(() => {
    void reloadCompartments()
  }, [reloadCompartments])

  const handleInventorySynced = useCallback(() => {
    void reloadResources()
  }, [reloadResources])

  const handleSyncCompartments = async () => {
    if (!companyId || !connectionId) {
      throw new Error('Select a company and connection first.')
    }
    return apiRequest(`${ociCompartmentsPath(companyId, connectionId)}/sync`, { method: 'POST' })
  }

  if (!companyId || !connectionId) {
    return (
      <>
        <h1 className="page-title">OCI Resources</h1>
        <p className="empty">Select a company and connection from the top bar.</p>
      </>
    )
  }

  return (
    <>
      <h1 className="page-title">OCI Resources</h1>

      <div className="tabs">
        {RESOURCE_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'compartments' ? (
        <CompartmentsTable
          companyId={companyId}
          connectionId={connectionId}
          compartments={compartments}
          loading={compartmentsLoading}
          onRefresh={handleRefreshCompartments}
          onSyncCompartments={handleSyncCompartments}
          onInventorySynced={handleInventorySynced}
          onViewDetail={(ocid) => void openView(ocid)}
        />
      ) : (
        <>
          <div className="filters">
            <label>
              Compartment
              <select
                value={compartmentFilter}
                onChange={(e) => setCompartmentFilter(e.target.value)}
                disabled={compartmentsLoading}
              >
                <option value={ALL_COMPARTMENTS}>All compartments</option>
                {compartments.map((c) => (
                  <option key={c.compartment_ocid} value={c.compartment_ocid}>
                    {c.name} ({c.compartment_ocid.slice(0, 24)}…)
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn" onClick={() => void reloadResources()}>
              Refresh
            </button>
          </div>

          <Alert type="error">{actionError || error || compartmentsError}</Alert>

          {loading ? (
            <p className="loading">Loading…</p>
          ) : (
            <DataTable rows={(data ?? []) as Record<string, unknown>[]} onRowClick={handleRowClick} />
          )}
        </>
      )}

      {tab === 'compartments' && (
        <Alert type="error">{actionError || compartmentsError}</Alert>
      )}

      {viewId && (
        <Modal
          title={`${tabConfig.label} details`}
          xl={tab === 'compartments'}
          wide={tab !== 'compartments'}
          onClose={() => setViewId(null)}
        >
          {viewLoading ? (
            <p className="loading">Loading…</p>
          ) : viewData ? (
            <JsonViewer data={viewData} />
          ) : null}
        </Modal>
      )}
    </>
  )
}
