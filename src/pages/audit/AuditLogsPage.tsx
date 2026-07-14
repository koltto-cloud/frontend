import { useEffect, useState } from 'react'
import { apiRequest } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import PaginationControls, {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/components/PaginationControls'
import { Alert } from '@/components/Alert'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'

interface AuditLogRow {
  event_id: string
  event_type?: string | null
  email?: string | null
  created_at?: string | null
  ip_address?: string | null
  url_path?: string | null
  [key: string]: unknown
}

function formatCreated(value: unknown): string {
  if (value == null || value === '') return '—'
  const d = new Date(String(value))
  if (!Number.isNaN(d.getTime())) return d.toLocaleString()
  return String(value)
}

function shortenId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

export default function AuditLogsPage() {
  const [userId, setUserId] = useState('')
  const [eventType, setEventType] = useState('')
  const [success, setSuccess] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [viewRow, setViewRow] = useState<AuditLogRow | null>(null)

  const { data, error, loading, reload } = useAsyncData(
    () => {
      const limit = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE)
      return apiRequest<AuditLogRow[]>('/api/v1/audit/logs', {
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
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Event type</th>
                  <th>Created</th>
                  <th>Email</th>
                  <th>IP address</th>
                  <th>URL path</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.event_id}>
                    <td>
                      <button
                        type="button"
                        className="id-link"
                        title={row.event_id}
                        onClick={() => setViewRow(row)}
                      >
                        {shortenId(String(row.event_id))}
                      </button>
                    </td>
                    <td>{row.event_type || '—'}</td>
                    <td>{formatCreated(row.created_at)}</td>
                    <td>{row.email || '—'}</td>
                    <td>{row.ip_address || '—'}</td>
                    <td>{row.url_path || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="empty">No audit logs found.</p>}
          </div>
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

      {viewRow && (
        <Modal title="Audit event details" onClose={() => setViewRow(null)} wide>
          <JsonViewer data={viewRow} />
        </Modal>
      )}
    </>
  )
}
