import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type CustomerShellProps = {
  children: React.ReactNode;
};

const CustomerShell: React.FC<CustomerShellProps> = ({ children }) => {
  const { companies, activeCompany, switchCompany, logout } = useAuth();
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
      if (false && href.startsWith('/') && !href.startsWith('/admin') && !href.startsWith('/login')) {
        const keep = new Set(['/','/profile']);
        if (!keep.has(href)) {
          href = `/admin${href}`;
        }
      }
      if (href !== rawHref) {
        link.setAttribute('href', href);
      }

      link.classList.remove('bg-primary', 'bg-opacity-25', 'text-primary', 'text-white-50');
      if (href === pathname) {
        link.classList.add('bg-primary', 'bg-opacity-25', 'text-primary');
      } else {
        link.classList.add('text-white-50');
      }
    }
  }, [pathname]);

  return (
    <>
      <aside className="bg-dark border-white border-opacity-10 border-end" id="sidebar">
              <div className="border-white border-opacity-10 sidebar-logo border-bottom">
                  <div className="logo-full"><a className="text-decoration-none d-flex align-items-center gap-2" href="/"><img className="img-fluid" width="2438" height="440" src="/logo-cloudey.png" /></a><button className="btn btn-sm bg-white bg-opacity-10 rounded-2 border-0 d-flex justify-content-center align-items-center ms-2 text-white-50" id="sidebarToggle" style={{width: '26px', height: '26px'}} aria-label="Collapse sidebar"><svg className="bi bi-chevron-left" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '11px'}}>
                              <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"></path>
                          </svg></button></div>
                  <div id="logoMini" className="logo-mini" style={{cursor: 'pointer'}} title="Expand sidebar"><img className="img-fluid" width="1280" height="1669" src="/logo-cloudey-icon-only.png" /></div>
              </div>
              <nav className="sidebar-nav">
                  <div className="text-white-50 nav-section-label"><span>Main</span></div><a className="bg-primary bg-opacity-25 nav-link text-primary" href="/" data-label="Dashboard"><svg className="bi bi-grid-1x2-fill flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M0 1a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1zm9 0a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1zm0 9a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1z"></path>
                      </svg><span className="lbl">Dashboard</span></a><a href="/cost-explorer" className="nav-link text-white-50" data-label="Cost Explorer"><svg className="bi bi-bar-chart-line-fill flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1z"></path>
                      </svg><span className="lbl">Cost Explorer</span></a><a href="/savings" className="nav-link text-white-50" data-label="Savings"><svg className="bi bi-piggy-bank-fill flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M7.964 1.527c-2.977 0-5.571 1.704-6.32 4.125h-.55A1 1 0 0 0 .11 6.824l.254 1.46a1.5 1.5 0 0 0 1.478 1.243h.263c.3.513.688.978 1.145 1.382l-.729 2.477a.5.5 0 0 0 .48.641h2a.5.5 0 0 0 .471-.332l.482-1.351c.635.173 1.31.267 2.011.267.707 0 1.388-.095 2.028-.272l.543 1.372a.5.5 0 0 0 .465.316h2a.5.5 0 0 0 .478-.645l-.761-2.506C13.81 9.895 14.5 8.559 14.5 7.069q0-.218-.02-.431c.261-.11.508-.266.705-.444.315.306.815.306.815-.417 0 .223-.5.223-.461-.026a1 1 0 0 0 .09-.255.7.7 0 0 0-.202-.645.58.58 0 0 0-.707-.098.74.74 0 0 0-.375.562c-.024.243.082.48.32.654a2 2 0 0 1-.259.153c-.534-2.664-3.284-4.595-6.442-4.595m7.173 3.876a.6.6 0 0 1-.098.21l-.044-.025c-.146-.09-.157-.175-.152-.223a.24.24 0 0 1 .117-.173c.049-.027.08-.021.113.012a.2.2 0 0 1 .064.199m-8.999-.65a.5.5 0 1 1-.276-.96A7.6 7.6 0 0 1 7.964 3.5c.763 0 1.497.11 2.18.315a.5.5 0 1 1-.287.958A6.6 6.6 0 0 0 7.964 4.5c-.64 0-1.255.09-1.826.254ZM5 6.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0"></path>
                      </svg><span className="lbl">Savings</span><span className="badge text-primary bg-primary bg-opacity-25 rounded-pill ms-auto lbl">7</span></a><a href="/anomalies" className="nav-link text-white-50" data-label="Anomalies"><svg className="bi bi-exclamation-triangle-fill flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"></path>
                      </svg><span className="lbl">Anomalies</span><span className="badge text-danger bg-danger bg-opacity-25 rounded-pill ms-auto lbl">3</span></a><a href="/resources" className="nav-link text-white-50" data-label="Resources"><svg className="bi bi-server flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M1.333 2.667C1.333 1.194 4.318 0 8 0s6.667 1.194 6.667 2.667V4c0 1.473-2.985 2.667-6.667 2.667S1.333 5.473 1.333 4z"></path>
                          <path d="M1.333 6.334v3C1.333 10.805 4.318 12 8 12s6.667-1.194 6.667-2.667V6.334a6.5 6.5 0 0 1-1.458.79C11.81 7.684 9.967 8 8 8s-3.809-.317-5.208-.876a6.5 6.5 0 0 1-1.458-.79z"></path>
                          <path d="M14.667 11.668a6.5 6.5 0 0 1-1.458.789c-1.4.56-3.242.876-5.21.876-1.966 0-3.809-.316-5.208-.876a6.5 6.5 0 0 1-1.458-.79v1.666C1.333 14.806 4.318 16 8 16s6.667-1.194 6.667-2.667z"></path>
                      </svg><span className="lbl">Resources</span></a><a href="/reports" className="nav-link text-white-50" data-label="Reports"><svg className="bi bi-file-earmark-bar-graph-fill flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0M9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1m.5 10v-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5m-2.5.5a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5zm-3 0a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5z"></path>
                      </svg><span className="lbl">Reports</span></a>
                  <div className="text-white-50 mt-2 nav-section-label"><span>More</span></div><a href="#" className="nav-link text-white-50" data-label="Ask Cloudey"><svg className="bi bi-chat-dots-fill flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M16 8c0 3.866-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.584.296-1.925.864-4.181 1.234-.2.032-.352-.176-.273-.362.354-.836.674-1.95.77-2.966C.744 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7M5 8a1 1 0 1 0-2 0 1 1 0 0 0 2 0m4 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0m3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2"></path>
                      </svg><span className="lbl">Ask Cloudey</span></a><a href="/settings" className="nav-link text-white-50" data-label="Settings"><svg className="bi bi-gear-fill flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"></path>
                      </svg><span className="lbl">Settings</span></a>
              </nav>
          </aside>
          <header className="bg-body border-bottom" id="topbar">
              <div className="input-group" style={{maxWidth: '320px', flex: '1'}}><span className="text-muted bg-body-secondary border input-group-text border-end-0"><svg className="bi bi-search" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '12px'}}>
                          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"></path>
                      </svg></span><input className="bg-body-secondary form-control ps-0 border-start-0 border-end-0" type="text" placeholder="Search resources, costs…" style={{fontSize: '13px'}} /><span className="text-muted bg-body-secondary border input-group-text border-start-0" style={{fontSize: '11px'}}>⌘K</span></div>
              <div>{companies.length > 1 && (<select className="form-select-sm form-select" value={activeCompany?.company_id ?? ''} onChange={(e) => { const v = e.target.value; if (v) void switchCompany(v); }}>{companies.length === 0 ? (<option value="">No companies</option>) : (companies.map((c) => (<option key={String(c.company_id)} value={String(c.company_id)}>{c.name}</option>)))}</select>)}</div>
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

export default CustomerShell;
