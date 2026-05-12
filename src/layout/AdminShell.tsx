import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type AdminShellProps = {
  children: React.ReactNode;
};

const AdminShell: React.FC<AdminShellProps> = ({ children }) => {
  const { companies, logout } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('#sidebar .sidebar-nav a[href]'));
    for (const link of links) {
      const rawHref = link.getAttribute('href') || '';
      let href = rawHref;
      if (href.startsWith('/../')) {
        href = '/' + href.replace('/../', '');
      }
      if (href === '/customer' || href === '/client' || href === '/customer/index') {
        href = '/';
      }
      if (true && href.startsWith('/') && !href.startsWith('/admin') && !href.startsWith('/login')) {
        const keep = new Set(['/','/profile']);
        if (!keep.has(href)) {
          href = `/admin${href}`;
        }
      }
      if (href !== rawHref) {
        link.setAttribute('href', href);
      }

      link.classList.remove('bg-warning', 'bg-opacity-25', 'text-warning', 'text-white-50');
      if (href === pathname) {
        link.classList.add('bg-warning', 'bg-opacity-25', 'text-warning');
      } else {
        link.classList.add('text-white-50');
      }
    }
  }, [pathname]);

  return (
    <>
      <aside className="bg-dark border-white border-opacity-10 border-end" id="sidebar">
              <div className="border-white border-opacity-10 sidebar-logo border-bottom">
                  <div className="logo-full"><a className="text-decoration-none d-flex align-items-center gap-2" href="/../admin/overview"><img className="img-fluid" width="2438" height="440" src="/logo-cloudey.png" /></a><button className="btn btn-sm bg-white bg-opacity-10 rounded-2 border-0 d-flex justify-content-center align-items-center ms-2 text-white-50" id="sidebarToggle" style={{width: '26px', height: '26px'}} aria-label="Collapse sidebar"><svg className="bi bi-chevron-left" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '11px'}}>
                              <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"></path>
                          </svg></button></div>
                  <div id="logoMini" className="logo-mini" style={{cursor: 'pointer'}} title="Expand sidebar"><img className="img-fluid" width="1280" height="1669" src="/logo-cloudey-icon-only.png" /></div>
              </div>
              <nav className="sidebar-nav">
                  <div className="text-white-50 nav-section-label"><span>Admin</span></div>
                  <div className="border-white border-opacity-10 sidebar-footer border-top">
                      <div className="rounded-2 d-flex align-items-center gap-2 px-2 py-2 lbl" style={{background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)'}}><svg className="bi bi-shield-check" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '12px', color: '#a78bfa'}}>
                              <path d="M5.338 1.59a61 61 0 0 0-2.837.856.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533q.18.085.293.118a1 1 0 0 0 .101.025 1 1 0 0 0 .1-.025q.114-.034.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"></path>
                              <path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0"></path>
                          </svg><small className="text-nowrap fw-semibold" style={{fontSize: '11px', color: '#a78bfa'}}>Admin Panel</small></div>
                  </div><a className="bg-warning bg-opacity-25 nav-link text-warning" href="/overview" data-label="Overview"><svg className="bi bi-grid-1x2-fill flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M0 1a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1zm9 0a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1zm0 9a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1z"></path>
                      </svg><span className="lbl">Overview</span></a><a href="/companies" className="nav-link text-white-50" data-label="Companies"><svg className="bi bi-bar-chart-line-fill flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1z"></path>
                      </svg><span className="lbl">Companies</span></a><a href="/users" className="nav-link text-white-50" data-label="Users"><svg className="bi bi-people-fill flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"></path>
                      </svg><span className="lbl">Users</span></a><a href="/memberships" className="nav-link text-white-50" data-label="Users"><svg className="bi bi-person-lines-fill flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zM11 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5m.5 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1zm2 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1zm0 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z"></path>
                      </svg><span className="lbl">Memberships</span></a>
                  <div className="border-white border-opacity-10 sidebar-footer border-top">
                      <div className="rounded-2 d-flex align-items-center gap-2 px-2 py-2 lbl" style={{background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)'}}><svg className="bi bi-people" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '12px', color: '#a78bfa'}}>
                              <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1L7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.5 5.5 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4"></path>
                          </svg><small className="text-nowrap fw-semibold" style={{fontSize: '11px', color: '#a78bfa'}}>Customer Panel</small></div>
                  </div><a href="/../customer" className="nav-link text-white-50" data-label="Users"><svg className="bi bi-box-arrow-up-right flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"></path>
                          <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"></path>
                      </svg><span className="lbl">Go to client view</span></a>
              </nav>
          </aside>
          <header className="bg-body border-bottom" id="topbar">
              <div className="d-flex align-items-center gap-2 ms-auto"><button className="btn btn-sm bg-body-secondary border d-flex justify-content-center align-items-center rounded-2 text-body-secondary" style={{width: '34px', height: '34px'}} aria-label="Toggle theme"><svg className="bi bi-moon-fill" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '13px'}}>
                          <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278"></path>
                      </svg></button>
                  <div className="position-relative"><button className="btn btn-sm bg-body-secondary border d-flex justify-content-center align-items-center rounded-2 text-body-secondary" style={{width: '34px', height: '34px'}} aria-label="Notifications"><svg className="bi bi-bell-fill" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '13px'}}>
                              <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901"></path>
                          </svg></button><span className="badge bg-danger rounded-pill position-absolute top-0 start-100 translate-middle" style={{fontSize: '9px', padding: '2px 5px'}}>3</span></div>
                  <div className="dropdown d-flex gap-2 ps-3 border-start"><button className="btn btn-primary dropdown-toggle d-flex align-items-center" data-bs-toggle="dropdown" aria-expanded="false" type="button"><svg className="bi bi-person-fill" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"></path>
                          </svg></button>
                      <div className="dropdown-menu"><a className="dropdown-item small" href="/../profile">Profile</a><a className="dropdown-item small" href="#" data-cloudey="auth.logout" onClick={(e) => { e.preventDefault(); logout(); }}>Logout</a></div>
                  </div>
              </div>
          </header>
      <main id="mainContent">{children}</main>
    </>
  );
};

export default AdminShell;
