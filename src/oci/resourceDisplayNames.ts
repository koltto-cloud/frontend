import { apiRequest } from '@/api/client'

const INVENTORY_LIST_PATHS = [
  { segment: 'compute', resource: 'compute' },
  { segment: 'block-storage', resource: 'block-storage' },
  { segment: 'object-storage', resource: 'object-storage' },
  { segment: 'file-storage', resource: 'file-storage' },
  { segment: 'load-balancer', resource: 'load-balancers' },
] as const

/** Map resource OCID → display_name from synced inventory lists. */
export async function loadResourceDisplayNames(
  companyId: string,
  connectionId: string,
): Promise<Record<string, string>> {
  const lists = await Promise.all(
    INVENTORY_LIST_PATHS.map(({ segment, resource }) =>
      apiRequest<{ resource_ocid?: string; display_name?: string | null }[]>(
        `/api/v1/cloud/oci/${segment}/${companyId}/connections/${connectionId}/${resource}`,
        { query: { limit: 500, offset: 0 } },
      ).catch(() => []),
    ),
  )

  const names: Record<string, string> = {}
  for (const rows of lists) {
    for (const row of rows) {
      const ocid = row.resource_ocid
      const name = row.display_name?.trim()
      if (ocid && name) names[ocid] = name
    }
  }
  return names
}

export function resourceDisplayLabel(
  resourceId: string | null | undefined,
  names: Record<string, string>,
  fallback = 'Unknown resource',
) {
  if (!resourceId) return fallback
  if (names[resourceId]) return names[resourceId]
  return resourceId.length > 28 ? `${resourceId.slice(0, 28)}…` : resourceId
}
