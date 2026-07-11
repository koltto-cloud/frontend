import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'

export interface OciSyncJobResponse {
  job_id: string
  status: string
}

export interface OciJobStatus {
  job_id: string
  status: string
  result?: unknown
  error?: string | null
}

const TERMINAL_STATUSES = new Set(['complete', 'not_found'])
const POLL_INTERVAL_MS = 2000

export function ociJobPath(jobId: string) {
  return `/api/v1/cloud/oci/jobs/${encodeURIComponent(jobId)}`
}

export function isOciSyncJobResponse(value: unknown): value is OciSyncJobResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'job_id' in value &&
    typeof (value as OciSyncJobResponse).job_id === 'string'
  )
}

export function useOciJobTracker() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<OciJobStatus | null>(null)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState('')
  const onCompleteRef = useRef<(() => void) | undefined>(undefined)

  const trackSyncResponse = useCallback((response: unknown, options?: { onComplete?: () => void }) => {
    if (!isOciSyncJobResponse(response)) return false
    onCompleteRef.current = options?.onComplete
    setError('')
    setJobId(response.job_id)
    setJob({ job_id: response.job_id, status: response.status ?? 'queued' })
    return true
  }, [])

  const checkJob = useCallback((id: string) => {
    const trimmed = id.trim()
    if (!trimmed) return
    onCompleteRef.current = undefined
    setError('')
    setJob(null)
    setJobId(trimmed)
  }, [])

  const dismiss = useCallback(() => {
    setJobId(null)
    setJob(null)
    setError('')
    setPolling(false)
    onCompleteRef.current = undefined
  }, [])

  useEffect(() => {
    if (!jobId) {
      setPolling(false)
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const poll = async () => {
      setPolling(true)
      setError('')
      try {
        const status = await apiRequest<OciJobStatus>(ociJobPath(jobId))
        if (cancelled) return

        setJob((prev) =>
          prev &&
          prev.status === status.status &&
          prev.error === status.error &&
          prev.job_id === status.job_id
            ? prev
            : status,
        )

        if (TERMINAL_STATUSES.has(status.status)) {
          setPolling(false)
          if (status.status === 'complete' && !status.error) {
            onCompleteRef.current?.()
          }
          return
        }

        timeoutId = setTimeout(() => void poll(), POLL_INTERVAL_MS)
      } catch (err) {
        if (cancelled) return
        setError(formatApiError(err))
        setPolling(false)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [jobId])

  return {
    job,
    jobId,
    polling,
    error,
    trackSyncResponse,
    checkJob,
    dismiss,
  }
}
