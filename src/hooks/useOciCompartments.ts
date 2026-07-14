import { apiRequest } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'

export interface OciCompartment {
  compartment_ocid: string
  tenancy_ocid: string
  name: string
  lifecycle_state?: string | null
  parent_compartment_ocid?: string | null
  time_created?: string | null
  synced_at?: string | null
}

export function ociCompartmentsPath(companyId: string, connectionId: string) {
  return `/api/v1/cloud/oci/compartment/${companyId}/connections/${connectionId}/compartments`
}

export function useOciCompartments(companyId: string | undefined, connectionId: string | undefined) {
  const path =
    companyId && connectionId ? ociCompartmentsPath(companyId, connectionId) : null

  const { data, error, loading, reload } = useAsyncData(
    () => (path ? apiRequest<OciCompartment[]>(path) : Promise.resolve([])),
    [path],
  )

  return { compartments: data ?? [], error, loading, reload }
}
