import { apiRequest } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Alert } from '@/components/Alert'
import JsonViewer from '@/components/JsonViewer'

export default function DashboardPage() {
  const { user, companies, activeCompany, connection } = useAuth()

  const health = useAsyncData<Record<string, unknown>>(
    () => apiRequest('/api/v1/health', { auth: false }),
    [],
  )
  const memberships = useAsyncData<unknown>(
    () => apiRequest('/api/v1/identity/memberships/me'),
    [],
  )

  return (
    <>
      <h1 className="page-title">Dashboard</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">API Health</div>
          <div className="value">{health.loading ? '…' : health.error ? '✗' : '✓'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Companies</div>
          <div className="value">{companies.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">User type</div>
          <div className="value" style={{ fontSize: '1rem' }}>
            {user?.user_type ?? '—'}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Session</h2>
        {user && <JsonViewer data={{ user, activeCompany, connection }} />}
      </div>

      <div className="card">
        <h2>Health check</h2>
        <Alert type="error">{health.error}</Alert>
        {health.data != null && <JsonViewer data={health.data} />}
      </div>

      <div className="card">
        <h2>My memberships</h2>
        <Alert type="error">{memberships.error}</Alert>
        {memberships.loading && <p className="loading">Loading…</p>}
        {memberships.data != null && <JsonViewer data={memberships.data} />}
      </div>
    </>
  )
}
