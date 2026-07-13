export const MONITORING_RESOURCE_TYPES = [
  { value: 'compute', label: 'Compute' },
  { value: 'block_storage', label: 'Block storage' },
  { value: 'object_storage', label: 'Object storage' },
  { value: 'file_storage', label: 'File storage' },
  { value: 'load_balancer', label: 'Load balancer' },
] as const

export type MonitoringResourceType = (typeof MONITORING_RESOURCE_TYPES)[number]['value']

export const MONITORING_RESOURCE_TYPE_ALL = 'all'

export function monitoringJobKey(compartmentOcid: string, resourceType: string) {
  return `monitoring:${compartmentOcid}:${resourceType}`
}

export function isMonitoringJobKey(key: string) {
  return key.startsWith('monitoring:')
}

export function parseMonitoringJobKey(key: string) {
  if (!isMonitoringJobKey(key)) return null
  const rest = key.slice('monitoring:'.length)
  const sep = rest.lastIndexOf(':')
  if (sep <= 0) return null
  return {
    compartmentOcid: rest.slice(0, sep),
    resourceType: rest.slice(sep + 1),
  }
}

export function monitoringResourceTypeLabel(resourceType: string) {
  return MONITORING_RESOURCE_TYPES.find((t) => t.value === resourceType)?.label ?? resourceType
}
