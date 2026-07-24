import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  AlertTriangle,
  Boxes,
  Building2,
  Cable,
  Calculator,
  CircleUser,
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
import type { User } from '@/api/client'

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }>

type NavLinkItem = { to: string; labelKey: string; icon: IconComponent }
type NavSection = { sectionKey: string; links: NavLinkItem[] }

/** Customer-facing: cost analysis, resources, and configuration */
const CUSTOMER_NAV: NavSection[] = [
  {
    sectionKey: 'nav.sections.costs',
    links: [
      { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
      { to: '/oci/cost-explorer', labelKey: 'nav.costExplorer', icon: FileBarChart },
      { to: '/oci/recommendations', labelKey: 'nav.recommendations', icon: Lightbulb },
      { to: '/oci/anomalies', labelKey: 'nav.costAnomalies', icon: AlertTriangle },
      { to: '/oci/unit-economics', labelKey: 'nav.unitEconomics', icon: Calculator },
    ],
  },
  {
    sectionKey: 'nav.sections.resources',
    links: [
      { to: '/oci/inventory', labelKey: 'nav.inventory', icon: Boxes },
      { to: '/oci/monitoring', labelKey: 'nav.monitoring', icon: Activity },
      { to: '/oci/reports', labelKey: 'nav.reports', icon: ScrollText },
    ],
  },
  {
    sectionKey: 'nav.sections.settings',
    links: [
      { to: '/connections', labelKey: 'nav.connections', icon: Cable },
      { to: '/oci/budgets', labelKey: 'nav.budgetsAlerts', icon: Wallet },
      { to: '/oci/allocation', labelKey: 'nav.allocations', icon: PieChart },
    ],
  },
]

/** Staff / internal ops — not shown to customers */
const INTERNAL_NAV: NavSection[] = [
  {
    sectionKey: 'nav.sections.identity',
    links: [
      { to: '/users', labelKey: 'nav.users', icon: Users },
      { to: '/companies', labelKey: 'nav.companies', icon: Building2 },
      { to: '/memberships', labelKey: 'nav.memberships', icon: UserCog },
    ],
  },
  {
    sectionKey: 'nav.sections.catalogBilling',
    links: [
      { to: '/catalog/plans', labelKey: 'nav.plans', icon: Layers },
      { to: '/catalog/features', labelKey: 'nav.services', icon: Package },
      { to: '/billing/subscriptions', labelKey: 'nav.subscriptions', icon: Repeat },
      { to: '/billing/invoices', labelKey: 'nav.invoices', icon: Receipt },
    ],
  },
  {
    sectionKey: 'nav.sections.admin',
    links: [
      { to: '/audit', labelKey: 'nav.auditLogs', icon: ClipboardList },
      { to: '/oci/pricing', labelKey: 'nav.ociPricing', icon: Tags },
      { to: '/admin/maintenance', labelKey: 'nav.maintenance', icon: Wrench },
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

function UserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const displayName = `${user.first_name} ${user.last_name}`.trim() || user.email

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="topbar-user-menu" ref={rootRef}>
      <button
        type="button"
        className="topbar-user-trigger"
        aria-label={t('common.accountMenu')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <CircleUser size={22} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open ? (
        <div className="topbar-user-panel" role="menu">
          <p className="topbar-user-panel-name">{displayName}</p>
          <Link
            to="/profile"
            role="menuitem"
            className="topbar-user-panel-item"
            onClick={() => setOpen(false)}
          >
            {t('common.profile')}
          </Link>
          <button
            type="button"
            role="menuitem"
            className="topbar-user-panel-item"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
          >
            {t('common.logout')}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function NavSections({ groups, onNavigate }: { groups: NavSection[]; onNavigate: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      {groups.map((group) => (
        <div key={group.sectionKey} className="nav-section">
          <p className="nav-section-title">{t(group.sectionKey)}</p>
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
                <span className="nav-link-label">{t(link.labelKey)}</span>
              </NavLink>
            )
          })}
        </div>
      ))}
    </>
  )
}

export default function Layout() {
  const { t } = useTranslation()
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
            <div className="nav-band-divider nav-band-divider--internal" role="separator" aria-label={t('common.internal')}>
              <span className="nav-band-divider-label">{t('common.internal')}</span>
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
          aria-label={t('common.closeNav')}
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
            <span>{t('common.menu')}</span>
          </button>
          <div className="context-bar">
            {companies.length > 0 && (
              <label>
                {t('common.company')}
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
                {t('common.connection')}
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
            {user ? <UserMenu user={user} onLogout={() => void logout()} /> : null}
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
