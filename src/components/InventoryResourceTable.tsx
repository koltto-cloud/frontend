import { Fragment, useMemo, useState } from 'react'
import { formatColumnLabel } from '@/utils/formatLabel'

export interface InventoryResourceRow {
  resource_ocid?: string | null
  tenancy_ocid?: string | null
  compartment_id?: string | null
  display_name?: string | null
  lifecycle_state?: string | null
  time_created?: string | null
  synced_at?: string | null
  [key: string]: unknown
}

/** Fields shown in the accordion, in order, by inventory tab. */
const DETAIL_FIELDS: Record<string, string[]> = {
  compute: [
    'resource_ocid',
    'compartment_id',
    'tenancy_ocid',
    'region',
    'lifecycle_state',
    'shape',
    'mem_gbs',
    'ocpus',
    'vcpus',
  ],
  'block-storage': [
    'resource_ocid',
    'compartment_id',
    'tenancy_ocid',
    'lifecycle_state',
    'size_in_gbs',
    'vpus_per_gb',
    'storage_type',
    'is_attached',
    'attached_instance_id',
  ],
  'object-storage': [
    'resource_ocid',
    'compartment_id',
    'tenancy_ocid',
    'lifecycle_state',
    'namespace',
    'storage_tier',
  ],
  'file-storage': [
    'resource_ocid',
    'compartment_id',
    'tenancy_ocid',
    'lifecycle_state',
    'availability_domain',
    'metered_bytes',
  ],
  'load-balancer': [
    'resource_ocid',
    'compartment_id',
    'tenancy_ocid',
    'lifecycle_state',
    'shape_name',
    'shape_min_bw_mbps',
    'shape_max_bw_mbps',
  ],
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'object') return JSON.stringify(value)
  const str = String(value)
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const d = new Date(str)
    if (!Number.isNaN(d.getTime())) return d.toLocaleString()
  }
  return str
}

interface InventoryResourceTableProps {
  tabKey: string
  rows: InventoryResourceRow[]
  compartmentNames: Record<string, string>
}

export default function InventoryResourceTable({
  tabKey,
  rows,
  compartmentNames,
}: InventoryResourceTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const detailFields = useMemo(
    () => DETAIL_FIELDS[tabKey] ?? ['resource_ocid', 'compartment_id', 'tenancy_ocid', 'lifecycle_state'],
    [tabKey],
  )

  if (rows.length === 0) return <p className="empty">No results.</p>

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table inventory-resource-table">
        <thead>
          <tr>
            <th className="col-expand" aria-label="Expand" />
            <th>Display name</th>
            <th>Compartment</th>
            <th>Region</th>
            <th>Status</th>
            <th>Created</th>
            <th>Synced</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const id = String(row.resource_ocid ?? index)
            const isOpen = expanded.has(id)
            const compartmentId = row.compartment_id ? String(row.compartment_id) : ''
            const compartmentLabel =
              (compartmentId && compartmentNames[compartmentId]) || compartmentId || '—'

            return (
              <Fragment key={id}>
                <tr
                  className={isOpen ? 'row-resource-expanded' : undefined}
                  onClick={() => toggle(id)}
                >
                  <td className="col-expand">
                    <span className="expand-chevron" aria-hidden>
                      {isOpen ? '▾' : '▸'}
                    </span>
                  </td>
                  <td>{formatValue(row.display_name)}</td>
                  <td title={compartmentId || undefined}>{compartmentLabel}</td>
                  <td>{formatValue(row.region)}</td>
                  <td>{formatValue(row.lifecycle_state)}</td>
                  <td>{formatValue(row.time_created)}</td>
                  <td>{formatValue(row.synced_at)}</td>
                </tr>
                {isOpen && (
                  <tr className="resource-detail-row">
                    <td colSpan={7}>
                      <dl className="resource-detail-list">
                        {detailFields.map((field) => (
                          <div key={field} className="resource-detail-item">
                            <dt>{formatColumnLabel(field)}</dt>
                            <dd>{formatValue(row[field])}</dd>
                          </div>
                        ))}
                      </dl>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
