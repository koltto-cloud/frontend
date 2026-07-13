import { useEffect, useState } from 'react'
import { apiRequest } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import DataTable from '@/components/DataTable'
import PaginationControls, {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/components/PaginationControls'
import { Alert } from '@/components/Alert'
import JsonViewer from '@/components/JsonViewer'

export default function AuditLogsPage() {
  const [userId, setUserId] = useState('')
  const [eventType, setEventType] = useState('')
  const [success, setSuccess] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const { data, error, loading, reload } = useAsyncData(
    () => {
      const limit = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE)
      return apiRequest<Record<string, unknown>[]>('/api/v1/audit/logs', {
        query: {
          user_id: userId || undefined,
          event_type: eventType || undefined,
          success: success === '' ? undefined : success === 'true',
          limit,
          offset: (page - 1) * limit,
        },
      })
    },
    [userId, eventType, success, page, pageSize],
  )

  useEffect(() => {
    setPage(1)
  }, [userId, eventType, success])

  const rows = data ?? []

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
        <button type="button" className="btn btn-primary" onClick={() => void reload()}>
          Search
        </button>
      </div>

      <Alert type="error">{error}</Alert>
      {loading ? (
        <p className="loading">Loading…</p>
      ) : (
        <>
          <DataTable rows={rows} paginate={false} />
          <PaginationControls
            page={page}
            pageSize={pageSize}
            itemCount={rows.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(Math.min(size, MAX_PAGE_SIZE))
              setPage(1)
            }}
          />
        </>
      )}

      {data && (
        <div className="card">
          <h2>Raw response</h2>
          <JsonViewer data={data} />
        </div>
      )}
    </>
  )
}
