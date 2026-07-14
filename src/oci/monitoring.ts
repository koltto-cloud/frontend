export const MONITORING_RESOURCE_TYPES = [
  { value: 'compute', label: 'Compute' },
  { value: 'block_storage', label: 'Block storage' },
  { value: 'object_storage', label: 'Object storage' },
  { value: 'file_storage', label: 'File storage' },
  { value: 'load_balancer', label: 'Load balancer' },
] as const

export type MonitoringResourceType = (typeof MONITORING_RESOURCE_TYPES)[number]['value']

/** Metrics synced per resource type (chart / filter options). */
export const MONITORING_METRICS_BY_TYPE: Record<MonitoringResourceType, { value: string; label: string }[]> = {
  compute: [
    { value: 'cpu_utilization', label: 'CPU utilization' },
    { value: 'memory_utilization', label: 'Memory utilization' },
    { value: 'load_average', label: 'Load average' },
  ],
  block_storage: [
    { value: 'read_throughput', label: 'Read throughput' },
    { value: 'write_throughput', label: 'Write throughput' },
    { value: 'guaranteed_vpus_per_gb', label: 'Guaranteed VPUs/GB' },
  ],
  object_storage: [
    { value: 'stored_bytes', label: 'Stored bytes' },
    { value: 'object_count', label: 'Object count' },
  ],
  file_storage: [
    { value: 'usage', label: 'Usage' },
    { value: 'read_throughput', label: 'Read throughput' },
    { value: 'write_throughput', label: 'Write throughput' },
  ],
  load_balancer: [
    { value: 'active_connections', label: 'Active connections' },
    { value: 'bytes_received', label: 'Bytes received' },
    { value: 'bytes_sent', label: 'Bytes sent' },
    { value: 'http_5xx', label: 'HTTP 5xx' },
  ],
}

/** Utilization metrics used for rightsizing badges (compute v1). */
export const COMPUTE_UTILIZATION_METRICS = ['cpu_utilization', 'memory_utilization'] as const

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
