/** Pure helpers for dashboard cost insights. */

export interface DailyCostPoint {
  date: string
  total_cost: number
}

/** YYYY-MM-DD in the user's local calendar (avoid UTC shift from toISOString). */
export function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dateKey(value: string | Date): string {
  if (value instanceof Date) return toLocalIsoDate(value)
  return String(value).slice(0, 10)
}

/**
 * Period total + daily average for a by-date series.
 *
 * Daily average uses days that actually have cost points (not empty calendar
 * months before the first sync). Day count still comes from the series items,
 * clamped to the series' own start/end so keepPreviousData stays consistent.
 */
export function periodStatsFromSeries(
  series: {
    start_date: string
    end_date: string
    items: DailyCostPoint[]
  } | null,
): { periodTotal: number; dailyAverage: number | null; dayCount: number } | null {
  if (series == null) return null
  const start = dateKey(series.start_date)
  const end = dateKey(series.end_date)
  const inRange = series.items.filter((item) => {
    const d = dateKey(item.date)
    return d >= start && d <= end
  })
  const periodTotal = inRange.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0)
  // Unique days with a series point (ignore blank calendar months before data starts).
  const daysWithData = new Set(inRange.map((item) => dateKey(item.date))).size
  return {
    periodTotal,
    dayCount: daysWithData,
    dailyAverage: daysWithData > 0 ? periodTotal / daysWithData : null,
  }
}
