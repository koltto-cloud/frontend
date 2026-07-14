/** Default rightsizing thresholds (%). Customers can override later. */
export const DEFAULT_UTILIZATION_UNDER = 20
export const DEFAULT_UTILIZATION_OVER = 80

export type UtilizationStatus = 'underutilized' | 'ok' | 'overutilized'

export interface UtilizationThresholds {
  under: number
  over: number
}

export const DEFAULT_UTILIZATION_THRESHOLDS: UtilizationThresholds = {
  under: DEFAULT_UTILIZATION_UNDER,
  over: DEFAULT_UTILIZATION_OVER,
}

export function classifyUtilization(
  meanPercent: number | null | undefined,
  thresholds: UtilizationThresholds = DEFAULT_UTILIZATION_THRESHOLDS,
): UtilizationStatus | null {
  if (meanPercent == null || Number.isNaN(meanPercent)) return null
  if (meanPercent < thresholds.under) return 'underutilized'
  if (meanPercent > thresholds.over) return 'overutilized'
  return 'ok'
}

/** Worst status wins: over > under > ok. */
export function combineUtilizationStatuses(
  statuses: Array<UtilizationStatus | null | undefined>,
): UtilizationStatus | null {
  const present = statuses.filter((s): s is UtilizationStatus => s != null)
  if (present.length === 0) return null
  if (present.includes('overutilized')) return 'overutilized'
  if (present.every((s) => s === 'underutilized')) return 'underutilized'
  if (present.includes('ok')) return 'ok'
  return 'underutilized'
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Percentile of sorted ascending values (linear interpolation). */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]
  const rank = (p / 100) * (sorted.length - 1)
  const low = Math.floor(rank)
  const high = Math.ceil(rank)
  if (low === high) return sorted[low]
  const weight = rank - low
  return sorted[low] * (1 - weight) + sorted[high] * weight
}

export const UTILIZATION_STATUS_LABEL: Record<UtilizationStatus, string> = {
  underutilized: 'Underutilized',
  ok: 'OK',
  overutilized: 'Overutilized',
}
