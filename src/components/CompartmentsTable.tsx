import { useMemo, useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useOciJobMap } from '@/hooks/useOciJobMap'
import { useOciJobTracker } from '@/hooks/useOciJob'
import { useOciSyncRun } from '@/hooks/useOciSyncRun'
import { useClientPagination } from '@/hooks/useClientPagination'
import type { OciCompartment } from '@/hooks/useOciCompartments'
import {
  MONITORING_RESOURCE_TYPES,
  monitoringJobKey,
  parseMonitoringJobKey,
} from '@/oci/monitoring'
import { Alert } from '@/components/Alert'
import CompartmentInventoryCell from '@/components/CompartmentInventoryCell'
import OciSyncRunPanel from '@/components/OciSyncRunPanel'
import PaginationControls from '@/components/PaginationControls'

function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function shortenOcid(ocid: string) {
  return ocid.length > 24 ? `${ocid.slice(0, 24)}…` : ocid
}

interface CompartmentsTableProps {
  companyId: string
  connectionId: string
  compartments: OciCompartment[]
  loading: boolean
  onRefresh: () => void
  onSyncCompartments: () => Promise<unknown>
  onInventorySynced?: () => void
  onViewDetail: (compartmentOcid: string) => void
}

export default function CompartmentsTable({
  companyId,
  connectionId,
  compartments,
  loading,
  onRefresh,
  onSyncCompartments,
  onInventorySynced,
  onViewDetail,
}: CompartmentsTableProps) {
  const defaults = defaultDateRange()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [usageSyncing, setUsageSyncing] = useState(false)
  const [monitoringSyncing, setMonitoringSyncing] = useState(false)
  const [compartmentSyncing, setCompartmentSyncing] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [expandedInventory, setExpandedInventory] = useState<Set<string>>(new Set())

  const { jobs, trackJob } = useOciJobMap()
  const {
    job: compartmentSyncJob,
    trackSyncResponse: trackCompartmentSync,
  } = useOciJobTracker()

  const inventorySync = useOciSyncRun(companyId, connectionId, {
    onComplete: onInventorySynced,
  })

  const usageBase = `/api/v1/cloud/oci/usage/${companyId}/connections/${connectionId}/usage`
  const monitoringBase = `/api/v1/cloud/oci/monitoring/${companyId}/connections/${connectionId}/monitoring`

  const allSelected = compartments.length > 0 && selected.size === compartments.length
  const someSelected = selected.size > 0

  const selectedList = useMemo(() => Array.from(selected), [selected])
  const {
    page,
    pageSize,
    pageItems: pageCompartments,
    totalItems,
    setPage,
    setPageSize,
  } = useClientPagination(compartments)

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(compartments.map((c) => c.compartment_ocid)))
    }
  }

  const toggleOne = (ocid: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(ocid)) next.delete(ocid)
      else next.add(ocid)
      return next
    })
  }

  const toggleInventoryExpand = (ocid: string) => {
    setExpandedInventory((prev) => {
      const next = new Set(prev)
      if (next.has(ocid)) next.delete(ocid)
      else next.add(ocid)
      return next
    })
  }

  const handleSyncInventory = async () => {
    if (selectedList.length === 0) {
      setError('Select at least one compartment.')
      return
    }
    setError('')
    setMsg('')
    const ok = await inventorySync.startSync(selectedList)
    if (ok) {
      setMsg(`Inventory sync started for ${selectedList.length} compartment(s).`)
    }
  }

  const handleSyncUsage = async () => {
    if (selectedList.length === 0) {
      setError('Select at least one compartment.')
      return
    }
    setError('')
    setMsg('')
    setUsageSyncing(true)
    try {
      const results = await Promise.all(
        selectedList.map(async (compartmentId) => {
          const res = await apiRequest(`${usageBase}/sync`, {
            method: 'POST',
            body: {
              start_date: startDate,
              end_date: endDate,
              compartment_id: compartmentId,
            },
          })
          trackJob(compartmentId, res)
          return compartmentId
        }),
      )
      setMsg(`Usage sync queued for ${results.length} compartment(s).`)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setUsageSyncing(false)
    }
  }

  const handleSyncMonitoring = async () => {
    if (selectedList.length === 0) {
      setError('Select at least one compartment.')
      return
    }
    setError('')
    setMsg('')
    setMonitoringSyncing(true)
    try {
      const tasks = selectedList.flatMap((compartmentId) =>
        MONITORING_RESOURCE_TYPES.map(async ({ value: resourceType }) => {
          const res = await apiRequest(`${monitoringBase}/sync`, {
            method: 'POST',
            body: {
              start_date: startDate,
              end_date: endDate,
              compartment_id: compartmentId,
              resource_type: resourceType,
            },
          })
          trackJob(monitoringJobKey(compartmentId, resourceType), res)
        }),
      )
      await Promise.all(tasks)
      setMsg(
        `Monitoring sync queued for ${selectedList.length} compartment(s) × all resource types (${tasks.length} job(s)).`,
      )
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setMonitoringSyncing(false)
    }
  }

  const handleSyncCompartments = async () => {
    setError('')
    setMsg('')
    setCompartmentSyncing(true)
    try {
      const res = await onSyncCompartments()
      if (trackCompartmentSync(res, { onComplete: onRefresh })) {
        setMsg('Compartment sync queued.')
      } else {
        setMsg('Compartment sync triggered.')
        onRefresh()
      }
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setCompartmentSyncing(false)
    }
  }

  if (loading && compartments.length === 0) return <p className="loading">Loading…</p>
  if (compartments.length === 0) {
    return (
      <>
        <div className="filters">
          <button type="button" className="btn" onClick={onRefresh}>
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={compartmentSyncing}
            onClick={() => void handleSyncCompartments()}
          >
            {compartmentSyncing ? 'Syncing…' : 'Sync compartments'}
          </button>
        </div>
        <Alert type="info">No compartments synced yet. Run a compartment sync to pull them from OCI.</Alert>
        <Alert type="error">{error}</Alert>
        <Alert type="success">{msg}</Alert>
      </>
    )
  }

  return (
    <>
      <div className="filters">
        <label>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!someSelected || inventorySync.starting}
          onClick={() => void handleSyncInventory()}
        >
          {inventorySync.starting
            ? 'Starting…'
            : `Sync inventory (${selected.size} selected)`}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!someSelected || usageSyncing}
          onClick={() => void handleSyncUsage()}
        >
          {usageSyncing ? 'Queueing…' : `Sync usage (${selected.size} selected)`}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!someSelected || monitoringSyncing}
          onClick={() => void handleSyncMonitoring()}
        >
          {monitoringSyncing
            ? 'Queueing…'
            : `Sync monitoring (${selected.size} selected)`}
        </button>
        <button type="button" className="btn" onClick={onRefresh}>
          Refresh
        </button>
        <button
          type="button"
          className="btn"
          disabled={compartmentSyncing}
          onClick={() => void handleSyncCompartments()}
        >
          {compartmentSyncing ? 'Syncing…' : 'Sync compartments'}
        </button>
      </div>

      {compartmentSyncJob && (
        <p className="job-inline-status">
          Compartment sync: {compartmentSyncJob.job_id.slice(0, 12)}… — {compartmentSyncJob.status}
        </p>
      )}

      <Alert type="error">{error || inventorySync.error}</Alert>
      <Alert type="success">{msg}</Alert>

      {inventorySync.showPanel && (
        <OciSyncRunPanel
          run={inventorySync.run}
          polling={inventorySync.polling}
          error=""
          starting={inventorySync.starting}
          cancelling={inventorySync.cancelling}
          showStart={false}
          showSteps={false}
          onCancel={() => void inventorySync.cancelSync()}
          onDismiss={inventorySync.dismiss}
          onRefresh={() => void inventorySync.refresh()}
        />
      )}

      <div className="data-table-wrap">
        <table className="data-table compartments-table">
          <colgroup>
            <col className="col-check" />
            <col className="col-ocid" />
            <col className="col-name" />
            <col className="col-job" />
          </colgroup>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  aria-label="Select all compartments"
                  onChange={toggleAll}
                />
              </th>
              <th>compartment_ocid</th>
              <th>name</th>
              <th>sync</th>
            </tr>
          </thead>
          <tbody>
            {pageCompartments.map((row) => {
              const ocid = row.compartment_ocid
              const usageJob = jobs[ocid]
              const monitoringJobs = Object.entries(jobs)
                .map(([key, job]) => {
                  const parsed = parseMonitoringJobKey(key)
                  if (!parsed || parsed.compartmentOcid !== ocid) return null
                  return { resourceType: parsed.resourceType, job }
                })
                .filter(
                  (item): item is { resourceType: string; job: (typeof jobs)[string] } =>
                    item !== null,
                )
              const inventory = inventorySync.getCompartmentDisplay(ocid)
              const steps = inventory?.steps ?? []
              const hasError =
                Boolean(usageJob?.error) ||
                monitoringJobs.some((m) => Boolean(m.job.error)) ||
                steps.some((s) => s.status === 'failed')
              const isExpanded = expandedInventory.has(ocid)
              return (
                <tr key={ocid} className={isExpanded ? 'row-inventory-expanded' : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(ocid)}
                      aria-label={`Select ${row.name}`}
                      onChange={() => toggleOne(ocid)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="id-link"
                      title={ocid}
                      onClick={() => onViewDetail(ocid)}
                    >
                      {shortenOcid(ocid)}
                    </button>
                  </td>
                  <td>{row.name}</td>
                  <td className={`col-job${hasError ? ' job-status-error' : ''}`}>
                    <CompartmentInventoryCell
                      usageJob={usageJob}
                      monitoringJobs={monitoringJobs}
                      inventory={inventory}
                      expanded={isExpanded}
                      onToggleExpand={() => toggleInventoryExpand(ocid)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!loading && compartments.length > 0 && (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          itemCount={pageCompartments.length}
          totalItems={totalItems}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </>
  )
}
