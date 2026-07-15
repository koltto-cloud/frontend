import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '@/api/client'
import type { OciSyncMaintenanceStatus } from '@/oci/syncMaintenance'

const POLL_MS = 30_000

export function useSyncsPaused(enabled = true) {
  const [status, setStatus] = useState<OciSyncMaintenanceStatus | null>(null)

  const load = useCallback(async () => {
    if (!enabled) return
    try {
      const data = await apiRequest<OciSyncMaintenanceStatus>('/api/v1/cloud/oci/maintenance')
      setStatus(data)
    } catch {
      // Do not block the UI if status cannot be loaded.
      setStatus(null)
    }
  }, [enabled])

  useEffect(() => {
    void load()
    if (!enabled) return
    const timer = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(timer)
  }, [enabled, load])

  const message = status?.message ?? null

  return {
    syncsPaused: status?.syncs_paused === true,
    message,
    loading: enabled && status === null,
    reload: load,
  }
}
