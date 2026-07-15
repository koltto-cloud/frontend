import { Alert } from '@/components/Alert'
import { SYNCS_PAUSED_MESSAGE } from '@/oci/syncMaintenance'

interface SyncsPausedBannerProps {
  message?: string | null
}

export default function SyncsPausedBanner({ message }: SyncsPausedBannerProps) {
  return (
    <Alert type="muted">
      {message ?? SYNCS_PAUSED_MESSAGE} Sync buttons are disabled until maintenance ends.
    </Alert>
  )
}
