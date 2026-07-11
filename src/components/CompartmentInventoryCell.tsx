import {
  TASK_NAME_LABELS,
  type CompartmentInventorySnapshot,
  type SyncStepRead,
} from '@/hooks/useOciSyncRun'
import type { TrackedJob } from '@/hooks/useOciJobMap'

function shortenJobId(jobId: string) {
  return jobId.length > 16 ? `${jobId.slice(0, 16)}…` : jobId
}

function stepStatusClass(status: string) {
  if (status === 'failed') return 'step-status-failed'
  if (status === 'complete') return 'step-status-complete'
  if (status === 'running') return 'step-status-running'
  return ''
}

export function lastInventorySyncedAt(snapshot: CompartmentInventorySnapshot | null) {
  if (!snapshot) return null
  const finishedAt = snapshot.steps
    .map((s) => s.finished_at)
    .filter((value): value is string => Boolean(value))
  if (finishedAt.length === 0) return null
  return finishedAt.reduce((latest, current) => (current > latest ? current : latest))
}

function formatSyncedAt(iso: string) {
  return new Date(iso).toLocaleString()
}

export function compartmentInventorySummary(snapshot: CompartmentInventorySnapshot | null) {
  if (!snapshot) return null
  const { steps, syncRunId, runStatus } = snapshot

  if (steps.length === 0) {
    if (runStatus === 'running' || runStatus === 'queued') {
      return { label: `inventory: ${syncRunId} — ${runStatus}`, status: runStatus }
    }
    return null
  }

  const running = steps.find((s) => s.status === 'running' || s.status === 'queued')
  if (running) {
    const jobId = running.arq_job_id ?? syncRunId
    return { label: `inventory: ${jobId} — ${running.status}`, status: running.status }
  }

  const failed = steps.filter((s) => s.status === 'failed')
  if (failed.length > 0) {
    const jobId = failed[0].arq_job_id ?? syncRunId
    return {
      label: `inventory: ${jobId} — failed (${failed.length} step(s))`,
      status: 'failed',
    }
  }

  const done = steps.every((s) => s.status === 'complete')
  if (done) {
    return { label: `inventory: ${syncRunId} — complete`, status: 'complete' }
  }

  return { label: `inventory: ${syncRunId} — ${runStatus}`, status: runStatus }
}

function usageLine(job: TrackedJob | undefined) {
  if (!job) return null
  if (job.error) return `usage: ${job.jobId} — ${job.status} — ${job.error}`
  return `usage: ${job.jobId} — ${job.status}`
}

function jobIdStatusLabel(jobId: string | null | undefined, status: string) {
  if (!jobId) return status
  return `${shortenJobId(jobId)} — ${status}`
}

function CompartmentStepsTable({ steps }: { steps: SyncStepRead[] }) {
  return (
    <table className="compartment-steps-table">
      <thead>
        <tr>
          <th>resource</th>
          <th>AD</th>
          <th>job</th>
          <th>synced</th>
          <th>error</th>
        </tr>
      </thead>
      <tbody>
        {steps.map((step) => (
          <tr key={step.sync_step_id} className={stepStatusClass(step.status)}>
            <td>{TASK_NAME_LABELS[step.task_name] ?? step.task_name}</td>
            <td>{step.availability_domain ?? '—'}</td>
            <td>{jobIdStatusLabel(step.arq_job_id, step.status)}</td>
            <td>{step.synced_count ?? '—'}</td>
            <td className="step-error-cell">{step.error ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface CompartmentInventoryCellProps {
  usageJob?: TrackedJob
  inventory: CompartmentInventorySnapshot | null
  expanded: boolean
  onToggleExpand: () => void
}

export default function CompartmentInventoryCell({
  usageJob,
  inventory,
  expanded,
  onToggleExpand,
}: CompartmentInventoryCellProps) {
  const usage = usageLine(usageJob)
  const summary = compartmentInventorySummary(inventory)
  const steps = inventory?.steps ?? []
  const lastSynced = lastInventorySyncedAt(inventory)
  const isActive =
    summary?.status === 'running' ||
    summary?.status === 'queued' ||
    inventory?.runStatus === 'running' ||
    inventory?.runStatus === 'queued'

  if (!usage && !summary) return <>—</>

  return (
    <div className="compartment-sync-cell">
      {usage && <div className="sync-line">{usage}</div>}
      {summary && (
        <div className="sync-line inventory-summary">
          <span className={`sync-status sync-status-${summary.status}`}>{summary.label}</span>
          {steps.length > 0 && (
            <button type="button" className="btn-expand-steps" onClick={onToggleExpand}>
              {expanded ? 'Hide steps' : `Show steps (${steps.length})`}
            </button>
          )}
        </div>
      )}
      {lastSynced && !isActive && (
        <div className="sync-line sync-last-updated">last synced: {formatSyncedAt(lastSynced)}</div>
      )}
      {expanded && steps.length > 0 && <CompartmentStepsTable steps={steps} />}
    </div>
  )
}
