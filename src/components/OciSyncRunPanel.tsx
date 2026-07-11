import { TASK_NAME_LABELS, type SyncRunDetail, type SyncStepRead } from '@/hooks/useOciSyncRun'
import { Alert } from '@/components/Alert'

function shortenOcid(ocid: string) {
  return ocid.length > 20 ? `${ocid.slice(0, 20)}…` : ocid
}

function shortenJobId(jobId: string) {
  return jobId.length > 16 ? `${jobId.slice(0, 16)}…` : jobId
}

function jobIdStatusLabel(jobId: string | null | undefined, status: string) {
  if (!jobId) return status
  return `${shortenJobId(jobId)} — ${status}`
}

function stepStatusClass(status: string) {
  if (status === 'failed') return 'step-status-failed'
  if (status === 'complete') return 'step-status-complete'
  if (status === 'running') return 'step-status-running'
  return ''
}

interface OciSyncRunPanelProps {
  run: SyncRunDetail | null
  polling: boolean
  error: string
  starting: boolean
  cancelling: boolean
  canStart?: boolean
  showStart?: boolean
  startLabel?: string
  prerequisiteHint?: string
  onStart?: () => void
  onCancel: () => void
  onDismiss: () => void
  onRefresh: () => void
  showSteps?: boolean
}

function isActive(status: string) {
  return status === 'queued' || status === 'running'
}

export default function OciSyncRunPanel({
  run,
  polling,
  error,
  starting,
  cancelling,
  canStart = true,
  showStart = true,
  startLabel = 'Sync all inventory',
  prerequisiteHint,
  onStart,
  onCancel,
  onDismiss,
  onRefresh,
  showSteps = true,
}: OciSyncRunPanelProps) {
  const showStartButton = showStart && (!run || !isActive(run.status))

  if (!showStart && !run && !error) return null

  return (
    <div className="card sync-run-panel">
      <div className="sync-run-header">
        <h2>Inventory sync</h2>
        <div className="sync-run-actions">
          {showStartButton && onStart && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canStart || starting}
              onClick={onStart}
            >
              {starting ? 'Starting…' : startLabel}
            </button>
          )}
          {run && isActive(run.status) && (
            <button
              type="button"
              className="btn"
              disabled={cancelling}
              onClick={onCancel}
            >
              {cancelling ? 'Cancelling…' : 'Cancel sync'}
            </button>
          )}
          {run && (
            <button type="button" className="btn" onClick={onRefresh}>
              Refresh
            </button>
          )}
          {run && !isActive(run.status) && (
            <button type="button" className="btn" onClick={onDismiss}>
              Dismiss
            </button>
          )}
        </div>
      </div>

      {!canStart && prerequisiteHint && (
        <Alert type="info">{prerequisiteHint}</Alert>
      )}

      <Alert type="error">{error}</Alert>

      {run && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Status</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {run.status}
                {polling ? ' (updating…)' : ''}
              </div>
            </div>
            <div className="stat-card">
              <div className="label">Progress</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {run.completed_steps} / {run.total_steps}
              </div>
            </div>
            <div className="stat-card">
              <div className="label">Failed steps</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {run.failed_steps}
              </div>
            </div>
          </div>

          {run.error_summary && <Alert type="error">{run.error_summary}</Alert>}

          {showSteps && <SyncStepsTable steps={run.steps} />}
        </>
      )}
    </div>
  )
}

function SyncStepsTable({ steps }: { steps: SyncStepRead[] }) {
  if (steps.length === 0) return <p className="empty">No steps yet.</p>

  return (
    <div className="data-table-wrap">
      <table className="data-table sync-steps-table">
        <thead>
          <tr>
            <th>resource</th>
            <th>compartment</th>
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
              <td title={step.compartment_id}>{shortenOcid(step.compartment_id)}</td>
              <td>{step.availability_domain ?? '—'}</td>
              <td className="col-job">{jobIdStatusLabel(step.arq_job_id, step.status)}</td>
              <td>{step.synced_count ?? '—'}</td>
              <td className="step-error-cell">{step.error ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
