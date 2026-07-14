/** Pure helpers for dashboard cost insights (spikes, forecast, budget). */

export interface DailyCostPoint {
  date: string
  total_cost: number
}

export interface DayOverDaySpike {
  date: string
  previousDate: string
  cost: number
  previousCost: number
  delta: number
  pctChange: number | null
}

export interface MonthForecast {
  monthStart: string
  today: string
  monthEnd: string
  mtd: number
  recentDailyAvg: number | null
  remainingDays: number
  projectedEom: number | null
}

const BUDGET_KEY_PREFIX = 'koltto:dashboard:budget:'

export function budgetStorageKey(companyId: string): string {
  return `${BUDGET_KEY_PREFIX}${companyId}`
}

export function loadBudget(companyId: string | null | undefined): number | null {
  if (!companyId || typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(budgetStorageKey(companyId))
  if (raw == null || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function saveBudget(companyId: string, amount: number | null): void {
  if (typeof localStorage === 'undefined') return
  const key = budgetStorageKey(companyId)
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    localStorage.removeItem(key)
    return
  }
  localStorage.setItem(key, String(amount))
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

export function daysInclusive(start: string, end: string): number {
  const a = new Date(`${dateKey(start)}T00:00:00Z`)
  const b = new Date(`${dateKey(end)}T00:00:00Z`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1
}

/** Sum daily costs; optionally clamp to an inclusive YYYY-MM-DD window. */
export function sumPeriodCost(
  items: DailyCostPoint[],
  start?: string,
  end?: string,
): number {
  const startKey = start != null ? dateKey(start) : null
  const endKey = end != null ? dateKey(end) : null
  return items.reduce((sum, item) => {
    const d = dateKey(item.date)
    if (startKey != null && d < startKey) return sum
    if (endKey != null && d > endKey) return sum
    return sum + (Number(item.total_cost) || 0)
  }, 0)
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

function parseUtcDate(iso: string): Date | null {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function daysBetweenUtc(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000)
}

/** Largest day-over-day cost increases in the series (sorted by delta desc). */
export function notableDayOverDaySpikes(
  items: DailyCostPoint[],
  limit = 5,
): DayOverDaySpike[] {
  if (items.length < 2) return []

  const sorted = [...items].sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)))
  const spikes: DayOverDaySpike[] = []

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const delta = (curr.total_cost || 0) - (prev.total_cost || 0)
    if (delta <= 0) continue
    const previousCost = prev.total_cost || 0
    spikes.push({
      date: dateKey(curr.date),
      previousDate: dateKey(prev.date),
      cost: curr.total_cost || 0,
      previousCost,
      delta,
      pctChange: previousCost > 0 ? (delta / previousCost) * 100 : null,
    })
  }

  spikes.sort((a, b) => b.delta - a.delta)
  return spikes.slice(0, limit)
}

/**
 * Calendar-month MTD + linear projected end-of-month from recent daily average.
 * Uses only points present in `items` (typically the selected dashboard range).
 */
export function computeMonthForecast(
  items: DailyCostPoint[],
  now: Date = new Date(),
  recentDayWindow = 7,
): MonthForecast {
  const today = toLocalIsoDate(now)
  const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const monthStart = toLocalIsoDate(monthStartDate)
  const monthEnd = toLocalIsoDate(monthEndDate)

  const inMonth = items.filter((i) => {
    const d = dateKey(i.date)
    return d >= monthStart && d <= today
  })
  const mtd = inMonth.reduce((sum, i) => sum + (i.total_cost || 0), 0)

  const sorted = [...items].sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)))
  const recent = sorted.slice(-Math.max(1, recentDayWindow))
  const recentDailyAvg =
    recent.length > 0
      ? recent.reduce((sum, i) => sum + (i.total_cost || 0), 0) / recent.length
      : null

  const todayDate = parseUtcDate(today)
  const monthEndUtc = parseUtcDate(monthEnd)
  const remainingDays =
    todayDate != null && monthEndUtc != null
      ? Math.max(0, daysBetweenUtc(todayDate, monthEndUtc))
      : 0

  const projectedEom =
    recentDailyAvg != null ? mtd + recentDailyAvg * remainingDays : mtd > 0 ? mtd : null

  return {
    monthStart,
    today,
    monthEnd,
    mtd,
    recentDailyAvg,
    remainingDays,
    projectedEom,
  }
}

export function budgetProgressPct(spent: number, budget: number | null): number | null {
  if (budget == null || budget <= 0 || !Number.isFinite(spent)) return null
  return Math.min(100, Math.max(0, (spent / budget) * 100))
}
