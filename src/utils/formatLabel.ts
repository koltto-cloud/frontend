/** Known tokens that should stay uppercase in column labels. */
const ACRONYMS: Record<string, string> = {
  id: 'ID',
  ocid: 'OCID',
  sku: 'SKU',
  ad: 'AD',
  totp: 'TOTP',
  oci: 'OCI',
  api: 'API',
  url: 'URL',
  uuid: 'UUID',
}

/** Prefer shorter product labels for common API fields. */
const FIELD_LABELS: Record<string, string> = {
  display_name: 'Display name',
  time_created: 'Created',
  created_at: 'Created',
  synced_at: 'Synced',
  updated_at: 'Updated',
  start_date: 'Start date',
  end_date: 'End date',
  due_date: 'Due date',
  metric_date: 'Date',
  resource_type: 'Resource type',
  metric_name: 'Metric',
  resource_id: 'Resource ID',
  resource_name: 'Resource',
  compartment_id: 'Compartment ID',
  mean_value: 'Mean',
  max_value: 'Max',
  min_value: 'Min',
  lifecycle_state: 'Status',
  account_status: 'Account status',
  user_type: 'User type',
  plan_type: 'Plan type',
}

/**
 * Turn API / snake_case (or kebab-case) field names into title-style labels.
 * e.g. display_name → Display name, compartment_ocid → Compartment OCID
 */
export function formatColumnLabel(key: string): string {
  if (!key) return ''
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]

  const parts = key
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .split(/[_\s-]+/)
    .filter(Boolean)

  return parts
    .map((part) => {
      const lower = part.toLowerCase()
      if (ACRONYMS[lower]) return ACRONYMS[lower]
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}
