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

function parseUtcDate(iso: string): Date | null {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
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

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date))
  const spikes: DayOverDaySpike[] = []

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const delta = (curr.total_cost || 0) - (prev.total_cost || 0)
    if (delta <= 0) continue
    const previousCost = prev.total_cost || 0
    spikes.push({
      date: curr.date,
      previousDate: prev.date,
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
  const today = toIsoDate(now)
  const monthStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const monthEndDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  const monthStart = toIsoDate(monthStartDate)
  const monthEnd = toIsoDate(monthEndDate)

  const inMonth = items.filter((i) => i.date >= monthStart && i.date <= today)
  const mtd = inMonth.reduce((sum, i) => sum + (i.total_cost || 0), 0)

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date))
  const recent = sorted.slice(-Math.max(1, recentDayWindow))
  const recentDailyAvg =
    recent.length > 0
      ? recent.reduce((sum, i) => sum + (i.total_cost || 0), 0) / recent.length
      : null

  const todayDate = parseUtcDate(today)
  const remainingDays =
    todayDate != null ? Math.max(0, daysBetweenUtc(todayDate, monthEndDate)) : 0

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
