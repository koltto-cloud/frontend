export const SYNCS_PAUSED_MESSAGE =
  'OCI syncs are paused for platform maintenance. Try again after the window ends.'

export interface OciSyncMaintenanceStatus {
  syncs_paused: boolean
  message?: string | null
}
