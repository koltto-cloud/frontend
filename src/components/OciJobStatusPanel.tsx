import { useState } from 'react'
import type { OciJobStatus } from '@/hooks/useOciJob'
import { Alert } from '@/components/Alert'
import JsonViewer from '@/components/JsonViewer'

interface OciJobStatusPanelProps {
  job: OciJobStatus | null
  polling: boolean
  error: string
  onDismiss: () => void
  onCheckJob: (jobId: string) => void
}

function statusLabel(status: string, polling: boolean) {
  if (polling) return `${status} (polling…)`
  return status
}

export default function OciJobStatusPanel({
  job,
  polling,
  error,
  onDismiss,
  onCheckJob,
}: OciJobStatusPanelProps) {
  const [manualJobId, setManualJobId] = useState('')

  return (
    <div className="card job-status-panel">
      <h2>Background job</h2>

      <div className="filters">
        <label>
          Job ID
          <input
            type="text"
            value={manualJobId}
            placeholder="Paste job_id to check status"
            onChange={(e) => setManualJobId(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn"
          disabled={!manualJobId.trim()}
          onClick={() => onCheckJob(manualJobId)}
        >
          Check status
        </button>
        {job && (
          <button type="button" className="btn" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>

      <Alert type="error">{error}</Alert>

      {job && (
        <div className="job-status-details">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Job ID</div>
              <div className="value" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                {job.job_id}
              </div>
            </div>
            <div className="stat-card">
              <div className="label">Status</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {statusLabel(job.status, polling)}
              </div>
            </div>
          </div>

          {job.error && <Alert type="error">{job.error}</Alert>}
          {job.result != null && (
            <div>
              <h3 style={{ margin: '0.75rem 0 0.5rem', fontSize: '0.9rem' }}>Result</h3>
              <JsonViewer data={job.result} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
