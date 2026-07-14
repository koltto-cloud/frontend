import { apiRequest } from '@/api/client'
import { resourceDisplayLabel } from '@/oci/resourceDisplayNames'
import {
  average,
  classifyUtilization,
  combineUtilizationStatuses,
  UTILIZATION_STATUS_LABEL,
  type UtilizationStatus,
} from '@/oci/utilization'
import { mapPool } from '@/utils/mapPool'

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

/** Cap how many top spenders we probe for utilization (each needs 2 metric calls). */
const MAX_CANDIDATES = 5
/** Bound parallel monitoring requests so we don't stampede the API. */
const MONITORING_CONCURRENCY = 2

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

/** OCI compute instance OCIDs contain `.instance.` — avoids listing full inventory. */
function isComputeResourceId(id: string): boolean {
  return /ocid1\.instance\./i.test(id)
}

/**
 * Rank underutilized compute among top spenders (fail-soft if monitoring is empty).
 *
 * Kept intentionally light for the main dashboard: identify compute via OCID shape,
 * fetch display names from compute inventory only, and probe a small candidate set
 * with capped concurrency (previously this fired 5× inventory + up to 20 metric calls).
 */
export async function loadUnderutilizedOpportunities(params: {
  companyId: string
  connectionId: string
  topResources: TopResourceItem[]
}): Promise<OpportunityRow[]> {
  const { companyId, connectionId, topResources } = params
  const computeBase = `/api/v1/cloud/oci/compute/${companyId}/connections/${connectionId}/compute`
  const monitoringBase = `/api/v1/cloud/oci/monitoring/${companyId}/connections/${connectionId}/monitoring`

  const candidates = topResources
    .filter((r) => r.resource_id && isComputeResourceId(r.resource_id))
    .slice(0, MAX_CANDIDATES)

  if (candidates.length === 0) return []

  const instances = await apiRequest<ComputeInstance[]>(computeBase, {
    query: { limit: 500, offset: 0 },
  }).catch(() => [] as ComputeInstance[])

  const names: Record<string, string> = {}
  for (const row of instances) {
    const ocid = row.resource_ocid
    const name = row.display_name?.trim()
    if (ocid && name) names[ocid] = name
  }

  const { start, end } = utilWindow(14)

  const rows = await mapPool(candidates, MONITORING_CONCURRENCY, async (item) => {
    const resourceId = item.resource_id as string
    try {
      const common = {
        resource_type: 'compute',
        resource_id: resourceId,
        start_date: start,
        end_date: end,
        // Hourly metrics × 14d ≈ 336 rows; no need for the 2000-row list default.
        limit: 500,
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

      const row: OpportunityRow = {
        resourceId,
        name: resourceDisplayLabel(resourceId, names, item.service ?? 'compute'),
        service: item.service,
        totalCost: item.total_cost || 0,
        cpuMean,
        memMean,
        status: 'underutilized',
        statusLabel: UTILIZATION_STATUS_LABEL.underutilized,
      }
      return row
    } catch {
      return null
    }
  })

  return rows
    .filter((r): r is OpportunityRow => r != null)
    .sort((a, b) => b.totalCost - a.totalCost)
}
