import { apiRequest } from '@/api/client'
import type { MonitoringResourceType } from '@/oci/monitoring'

export interface InventoryOption {
  resource_ocid: string
  display_name: string | null
  compartment_id?: string | null
  shape?: string | null
  mem_gbs?: number | null
  ocpus?: number | null
  vcpus?: number | null
  shape_name?: string | null
  shape_min_bw_mbps?: number | null
  shape_max_bw_mbps?: number | null
}

const INVENTORY_PATH: Record<
  MonitoringResourceType,
  { segment: string; resource: string }
> = {
  compute: { segment: 'compute', resource: 'compute' },
  block_storage: { segment: 'block-storage', resource: 'block-storage' },
  object_storage: { segment: 'object-storage', resource: 'object-storage' },
  file_storage: { segment: 'file-storage', resource: 'file-storage' },
  load_balancer: { segment: 'load-balancer', resource: 'load-balancers' },
}

export function isComputeOcid(resourceId: string | null | undefined): boolean {
  return Boolean(resourceId && resourceId.includes('.instance.'))
}

export async function loadInventoryOptions(
  resourceType: MonitoringResourceType,
  companyId: string,
  connectionId: string,
  compartmentId?: string,
): Promise<InventoryOption[]> {
  const path = INVENTORY_PATH[resourceType]
  if (!path) return []
  const rows = await apiRequest<InventoryOption[]>(
    `/api/v1/cloud/oci/${path.segment}/${companyId}/connections/${connectionId}/${path.resource}`,
    {
      query: {
        compartment_id: compartmentId || undefined,
        limit: 500,
        offset: 0,
      },
    },
  ).catch(() => [])
  return rows.filter((r) => Boolean(r.resource_ocid))
}

export function formatComputeCapacity(inst: InventoryOption | null | undefined): string | null {
  if (!inst) return null
  const parts: string[] = []
  if (inst.shape) parts.push(inst.shape)
  if (inst.ocpus != null) parts.push(`${inst.ocpus} OCPU`)
  if (inst.mem_gbs != null) parts.push(`${inst.mem_gbs} GB mem`)
  return parts.length ? parts.join(' · ') : null
}
