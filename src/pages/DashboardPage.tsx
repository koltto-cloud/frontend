import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function DashboardPage() {
  const { user, activeCompany, connection, connections } = useAuth()

  const firstName = user?.first_name?.trim()
  const greetingName = firstName || user?.email || 'there'
  const hasConnection = Boolean(connection?.connection_id)
  const hasCompany = Boolean(activeCompany?.company_id)

  let support =
    'Explore OCI inventory, usage, and monitoring for the companies connected to this tester.'
  if (hasCompany && hasConnection) {
    support = `You’re viewing ${activeCompany!.name} through ${
      connection!.name ?? 'your selected connection'
    }. Sync inventory or pull usage to exercise the APIs.`
  } else if (hasCompany && connections.length === 0) {
    support = `${activeCompany!.name} is selected, but there’s no OCI connection yet. Add one to unlock inventory and usage sync.`
  } else if (hasCompany) {
    support = `${activeCompany!.name} is selected. Pick a connection in the top bar to work with OCI data.`
  }

  return (
    <section className="dashboard-welcome">
      <h1 className="dashboard-greeting">Welcome back, {greetingName}</h1>
      <p className="dashboard-support">{support}</p>

      {(hasCompany || hasConnection) && (
        <p className="dashboard-context">
          {hasCompany && (
            <>
              Company <strong>{activeCompany!.name}</strong>
            </>
          )}
          {hasCompany && hasConnection && ' · '}
          {hasConnection && (
            <>
              Connection <strong>{connection!.name ?? connection!.connection_id.slice(0, 8)}</strong>
            </>
          )}
        </p>
      )}

      <div className="dashboard-actions">
        {hasConnection ? (
          <>
            <Link to="/oci/inventory" className="btn btn-primary">
              Open inventory
            </Link>
            <Link to="/oci/usage" className="btn">
              Usage & costs
            </Link>
          </>
        ) : (
          <>
            <Link to="/oci/connections" className="btn btn-primary">
              Set up a connection
            </Link>
            <Link to="/oci/inventory" className="btn">
              Inventory
            </Link>
          </>
        )}
      </div>
    </section>
  )
}
