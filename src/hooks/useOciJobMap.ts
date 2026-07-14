import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import {
  isOciSyncJobResponse,
  ociJobPath,
  type OciJobStatus,
} from '@/hooks/useOciJob'
import { mapPool } from '@/utils/mapPool'

export interface TrackedJob {
  jobId: string
  status: string
  polling: boolean
  error?: string
}

const TERMINAL_STATUSES = new Set(['complete', 'not_found'])
const POLL_INTERVAL_MS = 2000

export function useOciJobMap() {
  const [jobs, setJobs] = useState<Record<string, TrackedJob>>({})
  const jobsRef = useRef(jobs)
  jobsRef.current = jobs
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const pollActiveJobs = useCallback(async () => {
    const active = Object.entries(jobsRef.current).filter(
      ([, job]) => !TERMINAL_STATUSES.has(job.status),
    )
    if (active.length === 0) {
      stopPolling()
      return
    }

    // Cap concurrent job polls so we don't stampede the platform QueuePool
    // when many compartment/resource syncs are in flight.
    await mapPool(active, 4, async ([key, job]) => {
      try {
        const status = await apiRequest<OciJobStatus>(ociJobPath(job.jobId))
        setJobs((prev) => {
          const current = prev[key]
          if (
            current &&
            current.status === status.status &&
            current.error === (status.error ?? undefined)
          ) {
            return prev
          }
          return {
            ...prev,
            [key]: {
              jobId: job.jobId,
              status: status.status,
              polling: !TERMINAL_STATUSES.has(status.status),
              error: status.error ?? undefined,
            },
          }
        })
      } catch (err) {
        setJobs((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            polling: false,
            error: formatApiError(err),
          },
        }))
      }
    })

    const stillActive = Object.values(jobsRef.current).some(
      (job) => !TERMINAL_STATUSES.has(job.status),
    )
    if (stillActive) {
      pollTimerRef.current = setTimeout(() => void pollActiveJobs(), POLL_INTERVAL_MS)
    }
  }, [stopPolling])

  const trackJob = useCallback(
    (key: string, response: unknown) => {
      if (!isOciSyncJobResponse(response)) return false
      setJobs((prev) => ({
        ...prev,
        [key]: {
          jobId: response.job_id,
          status: response.status ?? 'queued',
          polling: true,
        },
      }))
      stopPolling()
      pollTimerRef.current = setTimeout(() => void pollActiveJobs(), POLL_INTERVAL_MS)
      return true
    },
    [pollActiveJobs, stopPolling],
  )

  const clearJob = useCallback((key: string) => {
    setJobs((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const clearAll = useCallback(() => setJobs({}), [])

  useEffect(() => () => stopPolling(), [stopPolling])

  return { jobs, trackJob, clearJob, clearAll }
}
