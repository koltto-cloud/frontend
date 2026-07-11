import { useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import DataTable from '@/components/DataTable'
import { Alert } from '@/components/Alert'

export default function PricingPage() {
  const [partNumber, setPartNumber] = useState('')
  const [syncMsg, setSyncMsg] = useState('')

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<Record<string, unknown>[]>('/api/v1/cloud/oci/pricing/pricing', {
        query: { part_number: partNumber || undefined },
      }),
    [partNumber],
  )

  const handleSync = async () => {
    setSyncMsg('')
    try {
      await apiRequest('/api/v1/cloud/oci/pricing/pricing/sync', { method: 'POST' })
      setSyncMsg('Pricing sync triggered.')
      void reload()
    } catch (err) {
      setSyncMsg(formatApiError(err))
    }
  }

  return (
    <>
      <h1 className="page-title">OCI Pricing</h1>
      <div className="filters">
        <label>
          Part number
          <input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="filter" />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => void reload()}>
          Search
        </button>
        <button type="button" className="btn" onClick={() => void handleSync()}>
          Sync pricing
        </button>
      </div>
      <Alert type="info">{syncMsg}</Alert>
      <Alert type="error">{error}</Alert>
      {loading ? <p className="loading">Loading…</p> : <DataTable rows={data ?? []} />}
    </>
  )
}
