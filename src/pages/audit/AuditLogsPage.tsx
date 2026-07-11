import { useState } from 'react'
import { apiRequest } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import DataTable from '@/components/DataTable'
import { Alert } from '@/components/Alert'
import JsonViewer from '@/components/JsonViewer'

export default function AuditLogsPage() {
  const [userId, setUserId] = useState('')
  const [eventType, setEventType] = useState('')
  const [success, setSuccess] = useState('')
  const [limit, setLimit] = useState('50')

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<Record<string, unknown>[]>('/api/v1/audit/logs', {
        query: {
          user_id: userId || undefined,
          event_type: eventType || undefined,
          success: success === '' ? undefined : success === 'true',
          limit,
        },
      }),
    [userId, eventType, success, limit],
  )

  return (
    <>
      <h1 className="page-title">Audit Logs</h1>
      <div className="filters">
        <label>
          User ID
          <input value={userId} onChange={(e) => setUserId(e.target.value)} />
        </label>
        <label>
          Event type
          <input value={eventType} onChange={(e) => setEventType(e.target.value)} />
        </label>
        <label>
          Success
          <select value={success} onChange={(e) => setSuccess(e.target.value)}>
            <option value="">All</option>
            <option value="true">yes</option>
            <option value="false">no</option>
          </select>
        </label>
        <label>
          Limit
          <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} min={1} max={500} />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => void reload()}>
          Search
        </button>
      </div>

      <Alert type="error">{error}</Alert>
      {loading ? <p className="loading">Loading…</p> : <DataTable rows={data ?? []} />}

      {data && (
        <div className="card">
          <h2>Raw response</h2>
          <JsonViewer data={data} />
        </div>
      )}
    </>
  )
}
