import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useSyncsPaused } from '@/hooks/useSyncsPaused'
import SyncsPausedBanner from '@/components/SyncsPausedBanner'

type NavLinkItem = { to: string; label: string }
type NavSection = { section: string; links: NavLinkItem[] }

/** Customer-facing: workspace + cloud products */
const CUSTOMER_NAV: NavSection[] = [
  {
    section: 'General',
    links: [
      { to: '/', label: 'Dashboard' },
      { to: '/connections', label: 'Connections' },
    ],
  },
  {
    section: 'OCI Cloud',
    links: [
      { to: '/oci/usage', label: 'Usage & Costs' },
      { to: '/oci/cost-explorer', label: 'Cost Explorer' },
      { to: '/oci/budgets', label: 'Budgets & Alerts' },
      { to: '/oci/reports', label: 'Reports' },
      { to: '/oci/unit-economics', label: 'Unit Economics' },
      { to: '/oci/allocation', label: 'Allocation' },
      { to: '/oci/inventory', label: 'Inventory' },
      { to: '/oci/monitoring', label: 'Monitoring' },
      { to: '/oci/recommendations', label: 'Recommendations' },
      { to: '/oci/anomalies', label: 'Cost Anomalies' },
    ],
  },
]

/** Staff / internal ops — not shown to customers */
const INTERNAL_NAV: NavSection[] = [
  {
    section: 'Identity',
    links: [
      { to: '/users', label: 'Users' },
      { to: '/companies', label: 'Companies' },
      { to: '/memberships', label: 'Memberships' },
    ],
  },
  {
    section: 'Catalog & Billing',
    links: [
      { to: '/catalog/plans', label: 'Plans' },
      { to: '/catalog/features', label: 'Services' },
      { to: '/billing/subscriptions', label: 'Subscriptions' },
      { to: '/billing/invoices', label: 'Invoices' },
    ],
  },
  {
    section: 'Admin',
    links: [
      { to: '/audit', label: 'Audit Logs' },
      { to: '/oci/pricing', label: 'OCI Pricing' },
      { to: '/admin/maintenance', label: 'Maintenance' },
    ],
  },
]

function isStaff(userType: string | undefined): boolean {
  return userType === 'staff' || userType === 'super_admin'
}

function topbarRoleClass(userType: string | undefined): string {
  if (userType === 'super_admin') return ' topbar--super-admin'
  if (userType === 'staff') return ' topbar--staff'
  return ''
}

function NavSections({ groups, onNavigate }: { groups: NavSection[]; onNavigate: () => void }) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.section} className="nav-section">
          <p className="nav-section-title">{group.section}</p>
          {group.links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              end={link.to === '/'}
              onClick={onNavigate}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      ))}
    </>
  )
}

export default function Layout() {
  const { user, companies, activeCompany, connections, connection, switchCompany, switchConnection, logout } =
    useAuth()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const onOciPage = location.pathname.startsWith('/oci')
  const { syncsPaused, message: syncsPausedMessage } = useSyncsPaused(onOciPage)
  const staff = isStaff(user?.user_type)

  useEffect(() => {
    if (!navOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  return (
    <div className="app-shell">
      <aside id="primary-navigation" className={`sidebar${navOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <p className="sidebar-brand-name">KÖLTTÖ</p>
        </div>

        <div className="nav-band">
          <NavSections groups={CUSTOMER_NAV} onNavigate={() => setNavOpen(false)} />
        </div>

        {staff ? (
          <>
            <div className="nav-band-divider" role="separator" aria-label="Internal">
              <span className="nav-band-divider-label">Internal</span>
            </div>
            <div className="nav-band nav-band--internal">
              <NavSections groups={INTERNAL_NAV} onNavigate={() => setNavOpen(false)} />
            </div>
          </>
        ) : null}
      </aside>
      {navOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="main">
        <header className={`topbar${topbarRoleClass(user?.user_type)}`}>
          <button
            type="button"
            className="mobile-menu-button"
            aria-controls="primary-navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span aria-hidden="true">☰</span>
            <span>Menu</span>
          </button>
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
                      {c.cloud ? `${c.cloud.toUpperCase()} · ` : ''}
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
                <span className="topbar-user-chip">{user.user_type}</span>
                <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
                  Logout
                </button>
              </>
            ) : null}
          </div>
        </header>

        <main className="content">
          {onOciPage && syncsPaused ? <SyncsPausedBanner message={syncsPausedMessage} /> : null}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
