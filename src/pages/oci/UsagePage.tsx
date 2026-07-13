import { useMemo, useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import BarChart from '@/components/BarChart'
import { Alert } from '@/components/Alert'

function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function formatUsd(amount: unknown) {
  if (amount === null || amount === undefined || amount === '') return '—'
  const value = Number(amount)
  if (Number.isNaN(value)) return '—'
  return `$${value.toFixed(2)}`
}

const INVENTORY_LIST_PATHS = [
  { segment: 'compute', resource: 'compute' },
  { segment: 'block-storage', resource: 'block-storage' },
  { segment: 'object-storage', resource: 'object-storage' },
  { segment: 'file-storage', resource: 'file-storage' },
  { segment: 'load-balancer', resource: 'load-balancers' },
] as const

async function loadResourceDisplayNames(
  companyId: string,
  connectionId: string,
): Promise<Record<string, string>> {
  const lists = await Promise.all(
    INVENTORY_LIST_PATHS.map(({ segment, resource }) =>
      apiRequest<{ resource_ocid?: string; display_name?: string | null }[]>(
        `/api/v1/cloud/oci/${segment}/${companyId}/connections/${connectionId}/${resource}`,
        { query: { limit: 500, offset: 0 } },
      ).catch(() => []),
    ),
  )

  const names: Record<string, string> = {}
  for (const rows of lists) {
    for (const row of rows) {
      const ocid = row.resource_ocid
      const name = row.display_name?.trim()
      if (ocid && name) names[ocid] = name
    }
  }
  return names
}

function topResourceLabel(
  item: { resource_id?: string; service?: string },
  names: Record<string, string>,
) {
  const id = item.resource_id
  if (id && names[id]) return names[id]
  if (id) return id.length > 28 ? `${id.slice(0, 28)}…` : id
  return item.service ?? 'unknown'
}

export default function UsagePage() {
  const { activeCompany, connection } = useAuth()
  const defaults = defaultDateRange()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [total, setTotal] = useState<Record<string, unknown> | null>(null)
  const [byService, setByService] = useState<Record<string, unknown> | null>(null)
  const [topResources, setTopResources] = useState<Record<string, unknown> | null>(null)
  const [resourceNames, setResourceNames] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id

  const serviceChart = useMemo(() => {
    const items = (byService?.items as { service?: string; total_cost?: number }[]) ?? []
    return items.map((i) => ({
      label: i.service ?? 'unknown',
      value: i.total_cost ?? 0,
    }))
  }, [byService])

  const topChart = useMemo(() => {
    const items =
      (topResources?.items as { resource_id?: string; service?: string; total_cost?: number }[]) ??
      []
    return items.map((i) => ({
      label: topResourceLabel(i, resourceNames),
      value: i.total_cost ?? 0,
      title: i.resource_id ?? i.service ?? undefined,
    }))
  }, [topResources, resourceNames])

  const base =
    companyId && connectionId
      ? `/api/v1/cloud/oci/usage/${companyId}/connections/${connectionId}/usage`
      : null

  const loadSummaries = async () => {
    if (!base || !companyId || !connectionId) return
    setError('')
    setLoading(true)
    try {
      const query = { start_date: startDate, end_date: endDate }
      const [totalRes, serviceRes, topRes, names] = await Promise.all([
        apiRequest<Record<string, unknown>>(`${base}/summary/total`, { query }),
        apiRequest<Record<string, unknown>>(`${base}/summary/by-service`, { query }),
        apiRequest<Record<string, unknown>>(`${base}/summary/top-resources`, {
          query: { ...query, limit: 10 },
        }),
        loadResourceDisplayNames(companyId, connectionId),
      ])
      setTotal(totalRes)
      setByService(serviceRes)
      setTopResources(topRes)
      setResourceNames(names)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!companyId || !connectionId) {
    return (
      <>
        <h1 className="page-title">Usage & Costs</h1>
        <p className="empty">Select a company and connection from the top bar.</p>
      </>
    )
  }

  return (
    <>
      <h1 className="page-title">Usage & Costs</h1>

      <div className="filters">
        <label>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          onClick={() => void loadSummaries()}
        >
          {loading ? 'Loading…' : 'Load summaries'}
        </button>
      </div>

      <Alert type="error">{error}</Alert>

      {total && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">Total cost</div>
            <div className="value">{formatUsd(total.total_cost)}</div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Cost by service</h2>
        <BarChart items={serviceChart} formatValue={(v) => `$${v.toFixed(2)}`} />
      </div>

      <div className="card">
        <h2>Top resources</h2>
        <BarChart items={topChart} formatValue={(v) => `$${v.toFixed(2)}`} />
      </div>
    </>
  )
}
