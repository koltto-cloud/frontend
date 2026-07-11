import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest, formatApiError, RequestError } from '@/api/client'

export const OCI_INVENTORY_RESOURCE_TYPES = [
  'oci_compute',
  'oci_block_storage',
  'oci_object_storage',
  'oci_file_storage',
  'oci_load_balancer',
] as const

export type OciInventoryResourceType = (typeof OCI_INVENTORY_RESOURCE_TYPES)[number]

export interface SyncStepRead {
  sync_step_id: string
  task_name: string
  compartment_id: string
  availability_domain?: string | null
  status: string
  arq_job_id?: string | null
  synced_count?: number | null
  error?: string | null
  started_at?: string | null
  finished_at?: string | null
}

export interface SyncRunSummary {
  sync_run_id: string
  connection_id: string
  status: string
  total_steps: number
  completed_steps: number
  failed_steps: number
}

export interface SyncRunDetail extends SyncRunSummary {
  tenancy_ocid?: string | null
  mode: string
  error_summary?: string | null
  started_at?: string | null
  finished_at?: string | null
  created_at: string
  scope?: Record<string, unknown>
  steps: SyncStepRead[]
}

const ACTIVE_STATUSES = new Set(['queued', 'running'])
const TERMINAL_STATUSES = new Set(['completed', 'completed_with_errors', 'failed', 'cancelled'])
const POLL_INTERVAL_MS = 2500

export function ociSyncRunPaths(companyId: string, connectionId: string) {
  const base = `/api/v1/cloud/oci/sync-runs/${companyId}`
  return {
    start: `${base}/connections/${connectionId}`,
    list: `${base}/connections/${connectionId}/sync-runs`,
    detail: (syncRunId: string) => `${base}/sync-runs/${syncRunId}`,
    cancel: (syncRunId: string) => `${base}/sync-runs/${syncRunId}/cancel`,
  }
}

function formatSyncRunError(err: unknown): string {
  if (err instanceof RequestError) {
    if (err.status === 409) {
      return 'A sync is already in progress for this connection. Track the active run below or cancel it first.'
    }
    if (err.status === 400) {
      const body = err.body as { detail?: string }
      if (typeof body?.detail === 'string') return body.detail
    }
  }
  return formatApiError(err)
}

function runProgressKey(run: SyncRunDetail) {
  return `${run.status}:${run.completed_steps}:${run.failed_steps}:${run.steps.map((s) => `${s.sync_step_id}:${s.status}:${s.arq_job_id ?? ''}`).join('|')}`
}

function shouldUpdateRun(prev: SyncRunDetail | null, next: SyncRunDetail) {
  if (!prev || prev.sync_run_id !== next.sync_run_id) return true
  return runProgressKey(prev) !== runProgressKey(next)
}

export interface CompartmentInventorySnapshot {
  syncRunId: string
  runStatus: string
  steps: SyncStepRead[]
}

function stepsByCompartment(steps: SyncStepRead[]) {
  const map: Record<string, SyncStepRead[]> = {}
  for (const step of steps) {
    if (!map[step.compartment_id]) map[step.compartment_id] = []
    map[step.compartment_id].push(step)
  }
  return map
}

function mergeRunIntoInventory(
  inventory: Record<string, CompartmentInventorySnapshot>,
  run: SyncRunDetail,
  onlyMissing: boolean,
) {
  const next = { ...inventory }
  for (const [ocid, steps] of Object.entries(stepsByCompartment(run.steps))) {
    if (steps.length === 0) continue
    if (onlyMissing && next[ocid]) continue
    next[ocid] = {
      syncRunId: run.sync_run_id,
      runStatus: run.status,
      steps,
    }
  }
  return next
}

function scopedCompartmentIds(run: SyncRunDetail | null) {
  if (!run?.scope) return null
  const ids = run.scope.compartment_ids
  return Array.isArray(ids) ? (ids as string[]) : null
}

export function getCompartmentInventoryDisplay(
  ocid: string,
  run: SyncRunDetail | null,
  inventory: Record<string, CompartmentInventorySnapshot>,
): CompartmentInventorySnapshot | null {
  const scoped = scopedCompartmentIds(run)
  const liveSteps = run ? run.steps.filter((s) => s.compartment_id === ocid) : []
  const inActiveScope =
    run !== null &&
    ACTIVE_STATUSES.has(run.status) &&
    (scoped?.includes(ocid) ?? liveSteps.length > 0)

  if (inActiveScope) {
    return {
      syncRunId: run!.sync_run_id,
      runStatus: run!.status,
      steps: liveSteps,
    }
  }

  if (run && TERMINAL_STATUSES.has(run.status) && liveSteps.length > 0) {
    return {
      syncRunId: run.sync_run_id,
      runStatus: run.status,
      steps: liveSteps,
    }
  }

  return inventory[ocid] ?? null
}

export function useOciSyncRun(
  companyId: string | undefined,
  connectionId: string | undefined,
  options?: { onComplete?: () => void },
) {
  const [run, setRun] = useState<SyncRunDetail | null>(null)
  const [compartmentInventory, setCompartmentInventory] = useState<
    Record<string, CompartmentInventorySnapshot>
  >({})
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [panelDismissed, setPanelDismissed] = useState(false)
  const onCompleteRef = useRef(options?.onComplete)
  onCompleteRef.current = options?.onComplete
  const completedRef = useRef<string | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const paths = useMemo(
    () => (companyId && connectionId ? ociSyncRunPaths(companyId, connectionId) : null),
    [companyId, connectionId],
  )

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setPolling(false)
  }, [])

  const fetchDetail = useCallback(
    async (syncRunId: string) => {
      if (!companyId) return null
      return apiRequest<SyncRunDetail>(ociSyncRunPaths(companyId, connectionId!).detail(syncRunId))
    },
    [companyId, connectionId],
  )

  const applyRun = useCallback((detail: SyncRunDetail) => {
    setRun((prev) => (shouldUpdateRun(prev, detail) ? detail : prev))
    if (TERMINAL_STATUSES.has(detail.status)) {
      setCompartmentInventory((prev) => mergeRunIntoInventory(prev, detail, false))
    }
  }, [])

  const loadInventoryHistory = useCallback(
    async (runs: SyncRunSummary[]) => {
      const completed = runs.filter((r) => TERMINAL_STATUSES.has(r.status))
      let inventory: Record<string, CompartmentInventorySnapshot> = {}
      let fetches = 0
      for (const summary of completed) {
        if (fetches >= 10) break
        const detail = await fetchDetail(summary.sync_run_id)
        fetches += 1
        if (!detail) continue
        inventory = mergeRunIntoInventory(inventory, detail, true)
      }
      setCompartmentInventory(inventory)
    },
    [fetchDetail],
  )

  const pollRun = useCallback(
    async (syncRunId: string) => {
      try {
        const detail = await fetchDetail(syncRunId)
        if (!detail) return

        applyRun(detail)

        if (TERMINAL_STATUSES.has(detail.status)) {
          stopPolling()
          if (completedRef.current !== syncRunId) {
            completedRef.current = syncRunId
            onCompleteRef.current?.()
          }
          return
        }

        setPolling(true)
        pollTimerRef.current = setTimeout(() => void pollRun(syncRunId), POLL_INTERVAL_MS)
      } catch (err) {
        setError(formatSyncRunError(err))
        stopPolling()
      }
    },
    [applyRun, fetchDetail, stopPolling],
  )

  const trackRun = useCallback(
    async (syncRunId: string) => {
      setError('')
      stopPolling()
      completedRef.current = null
      const detail = await fetchDetail(syncRunId)
      if (!detail) return
      applyRun(detail)
      if (!TERMINAL_STATUSES.has(detail.status)) {
        setPolling(true)
        pollTimerRef.current = setTimeout(() => void pollRun(syncRunId), POLL_INTERVAL_MS)
      }
    },
    [applyRun, fetchDetail, pollRun, stopPolling],
  )

  const bootstrapRun = useCallback(async () => {
    if (!paths) return
    try {
      const runs = await apiRequest<SyncRunSummary[]>(paths.list, { query: { limit: 20 } })
      await loadInventoryHistory(runs)
      const active = runs.find((r) => ACTIVE_STATUSES.has(r.status))
      if (active) {
        setPanelDismissed(false)
        await trackRun(active.sync_run_id)
        return
      }
      const completed = runs.find((r) => TERMINAL_STATUSES.has(r.status))
      if (completed) {
        setPanelDismissed(true)
        await trackRun(completed.sync_run_id)
      } else {
        setRun(null)
      }
    } catch {
      // ignore on initial load
    }
  }, [paths, trackRun, loadInventoryHistory])

  useEffect(() => {
    stopPolling()
    setError('')
    completedRef.current = null
    setPanelDismissed(false)
    if (!companyId || !connectionId) {
      setRun(null)
      setCompartmentInventory({})
      return
    }
    void bootstrapRun()
  }, [companyId, connectionId, bootstrapRun, stopPolling])

  useEffect(() => () => stopPolling(), [stopPolling])

  const startSync = useCallback(
    async (compartmentIds?: string[]) => {
      if (!paths) return false
      setStarting(true)
      setError('')
      setPanelDismissed(false)
      try {
        const res = await apiRequest<{ sync_run_id: string }>(paths.start, {
          method: 'POST',
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          body: {
            resource_types: [...OCI_INVENTORY_RESOURCE_TYPES],
            compartment_ids: compartmentIds?.length ? compartmentIds : null,
            mode: 'full',
          },
        })
        await trackRun(res.sync_run_id)
        return true
      } catch (err) {
        if (err instanceof RequestError && err.status === 409) {
          setError(formatSyncRunError(err))
          await bootstrapRun()
        } else {
          setError(formatSyncRunError(err))
        }
        return false
      } finally {
        setStarting(false)
      }
    },
    [paths, trackRun, bootstrapRun],
  )

  const cancelSync = useCallback(async () => {
    if (!paths || !run) return
    setCancelling(true)
    setError('')
    try {
      await apiRequest(paths.cancel(run.sync_run_id), { method: 'POST' })
      await trackRun(run.sync_run_id)
    } catch (err) {
      setError(formatSyncRunError(err))
    } finally {
      setCancelling(false)
    }
  }, [paths, run, trackRun])

  const dismiss = useCallback(() => {
    if (run && ACTIVE_STATUSES.has(run.status)) return
    setPanelDismissed(true)
    setError('')
  }, [run])

  const showPanel =
    run !== null && (!panelDismissed || ACTIVE_STATUSES.has(run.status))

  const getCompartmentDisplay = useCallback(
    (ocid: string) => getCompartmentInventoryDisplay(ocid, run, compartmentInventory),
    [run, compartmentInventory],
  )

  return {
    run,
    compartmentInventory,
    getCompartmentDisplay,
    polling,
    error,
    starting,
    cancelling,
    showPanel,
    startSync,
    cancelSync,
    dismiss,
    refresh: () => (run ? trackRun(run.sync_run_id) : bootstrapRun()),
  }
}

export const TASK_NAME_LABELS: Record<string, string> = {
  oci_compute: 'Compute',
  oci_block_storage: 'Block storage',
  oci_object_storage: 'Object storage',
  oci_file_storage: 'File storage',
  oci_load_balancer: 'Load balancer',
}
