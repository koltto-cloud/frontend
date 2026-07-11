export const CATALOG_STATUSES = ['active', 'inactive', 'deprecated'] as const
export const PLAN_TYPES = ['free', 'trial', 'paid', 'standalone'] as const
export const SUBSCRIPTION_STATUSES = ['active', 'pending', 'cancelled', 'expired', 'past_due'] as const
export const INVOICE_STATUSES = ['draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled'] as const

export function toDatetimeLocal(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null
}
