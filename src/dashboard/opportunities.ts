import { apiRequest } from '@/api/client'
import { loadResourceDisplayNames, resourceDisplayLabel } from '@/oci/resourceDisplayNames'
import {
  average,
  classifyUtilization,
  combineUtilizationStatuses,
  UTILIZATION_STATUS_LABEL,
  type UtilizationStatus,
} from '@/oci/utilization'

export interface TopResourceItem {
  resource_id: string | null
  service: string | null
  total_cost: number
}

interface MonitoringMetric {
  mean_value: number | null
}

interface ComputeInstance {
  resource_ocid?: string | null
  display_name?: string | null
}

export interface OpportunityRow {
  resourceId: string
  name: string
  service: string | null
  totalCost: number
  cpuMean: number | null
  memMean: number | null
  status: UtilizationStatus
  statusLabel: string
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function utilWindow(days = 14): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { start: toIsoDate(start), end: toIsoDate(end) }
}

function metricMeans(rows: MonitoringMetric[]): number | null {
  const values = rows
    .map((r) => (r.mean_value == null ? null : Number(r.mean_value)))
    .filter((v): v is number => v != null && !Number.isNaN(v))
  return average(values)
}

/**
 * Rank underutilized compute among top spenders (fail-soft if monitoring is empty).
 */
export async function loadUnderutilizedOpportunities(params: {
  companyId: string
  connectionId: string
  topResources: TopResourceItem[]
}): Promise<OpportunityRow[]> {
  const { companyId, connectionId, topResources } = params
  const computeBase = `/api/v1/cloud/oci/compute/${companyId}/connections/${connectionId}/compute`
  const monitoringBase = `/api/v1/cloud/oci/monitoring/${companyId}/connections/${connectionId}/monitoring`

  const [instances, names] = await Promise.all([
    apiRequest<ComputeInstance[]>(computeBase, {
      query: { limit: 500, offset: 0 },
    }).catch(() => [] as ComputeInstance[]),
    loadResourceDisplayNames(companyId, connectionId).catch(() => ({}) as Record<string, string>),
  ])

  const computeIds = new Set(
    instances.map((i) => i.resource_ocid).filter((id): id is string => Boolean(id)),
  )

  const candidates = topResources
    .filter((r) => r.resource_id && computeIds.has(r.resource_id))
    .slice(0, 10)

  if (candidates.length === 0) return []

  const { start, end } = utilWindow(14)

  const rows = await Promise.all(
    candidates.map(async (item) => {
      const resourceId = item.resource_id as string
      try {
        const common = {
          resource_type: 'compute',
          resource_id: resourceId,
          start_date: start,
          end_date: end,
          limit: 2000,
          offset: 0,
        }
        const [cpu, memory] = await Promise.all([
          apiRequest<MonitoringMetric[]>(monitoringBase, {
            query: { ...common, metric_name: 'cpu_utilization' },
          }).catch(() => [] as MonitoringMetric[]),
          apiRequest<MonitoringMetric[]>(monitoringBase, {
            query: { ...common, metric_name: 'memory_utilization' },
          }).catch(() => [] as MonitoringMetric[]),
        ])

        const cpuMean = metricMeans(cpu)
        const memMean = metricMeans(memory)
        const overall = combineUtilizationStatuses([
          classifyUtilization(cpuMean),
          classifyUtilization(memMean),
        ])

        if (overall !== 'underutilized') return null

        return {
          resourceId,
          name: resourceDisplayLabel(resourceId, names, item.service ?? 'compute'),
          service: item.service,
          totalCost: item.total_cost || 0,
          cpuMean,
          memMean,
          status: overall,
          statusLabel: UTILIZATION_STATUS_LABEL[overall],
        } satisfies OpportunityRow
      } catch {
        return null
      }
    }),
  )

  return rows
    .filter((r): r is OpportunityRow => r != null)
    .sort((a, b) => b.totalCost - a.totalCost)
}
