import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Boxes,
  Building2,
  Cable,
  Calculator,
  ClipboardList,
  FileBarChart,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Package,
  PieChart,
  Receipt,
  Repeat,
  ScrollText,
  Tags,
  UserCog,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSyncsPaused } from '@/hooks/useSyncsPaused'
import SyncsPausedBanner from '@/components/SyncsPausedBanner'

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }>

type NavLinkItem = { to: string; label: string; icon: IconComponent }
type NavSection = { section: string; links: NavLinkItem[] }

/** Customer-facing: cost analysis, resources, and configuration */
const CUSTOMER_NAV: NavSection[] = [
  {
    section: 'Costs',
    links: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/oci/cost-explorer', label: 'Cost Explorer', icon: FileBarChart },
      { to: '/oci/recommendations', label: 'Recommendations', icon: Lightbulb },
      { to: '/oci/anomalies', label: 'Cost Anomalies', icon: AlertTriangle },
      { to: '/oci/unit-economics', label: 'Unit Economics', icon: Calculator },
    ],
  },
  {
    section: 'Resources',
    links: [
      { to: '/oci/inventory', label: 'Inventory', icon: Boxes },
      { to: '/oci/monitoring', label: 'Monitoring', icon: Activity },
      { to: '/oci/reports', label: 'Reports', icon: ScrollText },
    ],
  },
  {
    section: 'Settings',
    links: [
      { to: '/connections', label: 'Connections', icon: Cable },
      { to: '/oci/budgets', label: 'Budgets & Alerts', icon: Wallet },
      { to: '/oci/allocation', label: 'Allocations', icon: PieChart },
    ],
  },
]

/** Staff / internal ops — not shown to customers */
const INTERNAL_NAV: NavSection[] = [
  {
    section: 'Identity',
    links: [
      { to: '/users', label: 'Users', icon: Users },
      { to: '/companies', label: 'Companies', icon: Building2 },
      { to: '/memberships', label: 'Memberships', icon: UserCog },
    ],
  },
  {
    section: 'Catalog & Billing',
    links: [
      { to: '/catalog/plans', label: 'Plans', icon: Layers },
      { to: '/catalog/features', label: 'Services', icon: Package },
      { to: '/billing/subscriptions', label: 'Subscriptions', icon: Repeat },
      { to: '/billing/invoices', label: 'Invoices', icon: Receipt },
    ],
  },
  {
    section: 'Admin',
    links: [
      { to: '/audit', label: 'Audit Logs', icon: ClipboardList },
      { to: '/oci/pricing', label: 'OCI Pricing', icon: Tags },
      { to: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
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
          {group.links.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                end={link.to === '/'}
                onClick={onNavigate}
              >
                <Icon className="nav-link-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
                <span className="nav-link-label">{link.label}</span>
              </NavLink>
            )
          })}
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
          <div className="nav-band-internal-zone">
            <div className="nav-band-divider nav-band-divider--internal" role="separator" aria-label="Internal">
              <span className="nav-band-divider-label">Internal</span>
            </div>
            <div className="nav-band">
              <NavSections groups={INTERNAL_NAV} onNavigate={() => setNavOpen(false)} />
            </div>
          </div>
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
