import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const NAV = [
  { section: 'General', links: [{ to: '/', label: 'Dashboard' }] },
  {
    section: 'Identity',
    links: [
      { to: '/users', label: 'Users' },
      { to: '/companies', label: 'Companies' },
      { to: '/memberships', label: 'Memberships' },
    ],
  },
  {
    section: 'Auth & Audit',
    links: [{ to: '/audit', label: 'Audit Logs' }],
  },
  {
    section: 'Catalog & Billing',
    links: [
      { to: '/catalog/plans', label: 'Plans' },
      { to: '/catalog/features', label: 'Features' },
      { to: '/catalog/plan-features', label: 'Plan Features' },
      { to: '/catalog/subscription-items', label: 'Subscription Items' },
      { to: '/billing/subscriptions', label: 'Subscriptions' },
      { to: '/billing/invoices', label: 'Invoices' },
      { to: '/billing/invoice-items', label: 'Invoice Items' },
    ],
  },
  {
    section: 'OCI Cloud',
    links: [
      { to: '/oci/connections', label: 'Connections' },
      { to: '/oci/usage', label: 'Usage & Costs' },
      { to: '/oci/inventory', label: 'Inventory' },
      { to: '/oci/monitoring', label: 'Monitoring' },
      { to: '/oci/pricing', label: 'Pricing' },
    ],
  },
]

export default function Layout() {
  const { user, companies, activeCompany, connections, connection, switchCompany, switchConnection, logout } =
    useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>KÖLTTÖ TESTER</h1>
        {NAV.map((group) => (
          <div key={group.section} className="nav-section">
            <p className="nav-section-title">{group.section}</p>
            {group.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                end={link.to === '/'}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="context-bar">
            {companies.length > 0 && (
              <label>
                Company
                <select
                  value={activeCompany?.company_id ?? ''}
                  onChange={(e) => void switchCompany(e.target.value)}
                >
                  {companies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {connections.length > 0 && (
              <label>
                Connection
                <select
                  value={connection?.connection_id ?? ''}
                  onChange={(e) => switchConnection(e.target.value)}
                >
                  {connections.map((c) => (
                    <option key={c.connection_id} value={c.connection_id}>
                      {c.name ?? c.connection_id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="topbar-user">
            {user ? (
              <>
                <Link to="/profile" className="topbar-user-link">
                  {user.first_name} {user.last_name}
                </Link>
                <span className="topbar-user-meta"> ({user.user_type})</span>
                {' · '}
                <button type="button" className="btn" onClick={() => void logout()}>
                  Logout
                </button>
              </>
            ) : null}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
