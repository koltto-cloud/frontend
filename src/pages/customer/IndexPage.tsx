import React from 'react';
import CustomerShell from '../../layout/CustomerShell';

const IndexPage: React.FC = () => {
  return (
    <CustomerShell>
      <div className="container-fluid" style={{maxWidth: '1200px', padding: '32px 32px 80px'}}>
                  <div className="mb-4">
                      <h1 className="fw-bold text-body mb-1 h4">Dashboard</h1>
                      <div className="d-flex align-items-center flex-wrap gap-2"><small className="text-muted">April 2026</small><small className="text-muted">·</small><span className="badge text-success rounded-pill"><svg className="bi bi-circle-fill me-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '5px', verticalAlign: '2px'}}>
                                  <circle cx="8" cy="8" r="8"></circle>
                              </svg> OCI Connected </span><span className="badge fw-normal text-secondary-emphasis bg-secondary-subtle" style={{fontSize: '10px'}}>AWS soon</span><span className="badge fw-normal text-secondary-emphasis bg-secondary-subtle" style={{fontSize: '10px'}}>GCP soon</span></div>
                  </div>
                  <div className="row mb-4 g-3">
                      <div className="col-md-6 col-xl-3">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body">
                                  <div className="d-flex align-items-center gap-2 mb-3">
                                      <div className="bg-primary bg-opacity-10 rounded-2 d-flex justify-content-center align-items-center" style={{width: '32px', height: '32px'}}><svg className="bi bi-bar-chart-line-fill text-primary" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '13px'}}>
                                              <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1z"></path>
                                          </svg></div><small className="fw-medium text-muted">Total Spend (Apr)</small>
                                  </div>
                                  <div className="text-body stat-value"><span>$24,840</span></div>
                                  <div className="d-flex align-items-center gap-1 mt-2"><small className="fw-semibold text-danger"><svg className="bi bi-arrow-up-short" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                                              <path fillRule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5"></path>
                                          </svg>+12% </small><small className="text-muted">vs last month</small></div>
                              </div>
                          </div>
                      </div>
                      <div className="col-md-6 col-xl-3">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body">
                                  <div className="d-flex align-items-center gap-2 mb-3">
                                      <div className="bg-success bg-opacity-10 rounded-2 d-flex justify-content-center align-items-center" style={{width: '32px', height: '32px'}}><svg className="bi bi-piggy-bank-fill text-success" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '13px'}}>
                                              <path d="M7.964 1.527c-2.977 0-5.571 1.704-6.32 4.125h-.55A1 1 0 0 0 .11 6.824l.254 1.46a1.5 1.5 0 0 0 1.478 1.243h.263c.3.513.688.978 1.145 1.382l-.729 2.477a.5.5 0 0 0 .48.641h2a.5.5 0 0 0 .471-.332l.482-1.351c.635.173 1.31.267 2.011.267.707 0 1.388-.095 2.028-.272l.543 1.372a.5.5 0 0 0 .465.316h2a.5.5 0 0 0 .478-.645l-.761-2.506C13.81 9.895 14.5 8.559 14.5 7.069q0-.218-.02-.431c.261-.11.508-.266.705-.444.315.306.815.306.815-.417 0 .223-.5.223-.461-.026a1 1 0 0 0 .09-.255.7.7 0 0 0-.202-.645.58.58 0 0 0-.707-.098.74.74 0 0 0-.375.562c-.024.243.082.48.32.654a2 2 0 0 1-.259.153c-.534-2.664-3.284-4.595-6.442-4.595m7.173 3.876a.6.6 0 0 1-.098.21l-.044-.025c-.146-.09-.157-.175-.152-.223a.24.24 0 0 1 .117-.173c.049-.027.08-.021.113.012a.2.2 0 0 1 .064.199m-8.999-.65a.5.5 0 1 1-.276-.96A7.6 7.6 0 0 1 7.964 3.5c.763 0 1.497.11 2.18.315a.5.5 0 1 1-.287.958A6.6 6.6 0 0 0 7.964 4.5c-.64 0-1.255.09-1.826.254ZM5 6.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0"></path>
                                          </svg></div><small className="fw-medium text-muted">Savings Found</small>
                                  </div>
                                  <div className="text-success stat-value"><span>$7,820</span></div>
                                  <div className="d-flex align-items-center gap-1 mt-2"><small className="fw-semibold text-success"><svg className="bi bi-arrow-up-short" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                                              <path fillRule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5"></path>
                                          </svg>+$1,200 </small><small className="text-muted">this month</small></div>
                              </div>
                          </div>
                      </div>
                      <div className="col-md-6 col-xl-3">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body">
                                  <div className="d-flex align-items-center gap-2 mb-3">
                                      <div className="bg-danger bg-opacity-10 rounded-2 d-flex justify-content-center align-items-center" style={{width: '32px', height: '32px'}}><svg className="bi bi-exclamation-triangle-fill text-danger" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '13px'}}>
                                              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"></path>
                                          </svg></div><small className="fw-medium text-muted">Active Anomalies</small>
                                  </div>
                                  <div className="text-danger stat-value"><span>3</span></div>
                                  <div className="d-flex align-items-center gap-1 mt-2"><small className="fw-semibold text-danger"><svg className="bi bi-arrow-up-short" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                                              <path fillRule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5"></path>
                                          </svg>+1 </small><small className="text-muted">needs attention</small></div>
                              </div>
                          </div>
                      </div>
                      <div className="col-md-6 col-xl-3">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body">
                                  <div className="d-flex align-items-center gap-2 mb-3">
                                      <div className="rounded-2 d-flex justify-content-center align-items-center" style={{width: '32px', height: '32px', background: 'rgba(139,92,246,.1)'}}><svg className="bi bi-server" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '13px', color: '#8B5CF6'}}>
                                              <path d="M1.333 2.667C1.333 1.194 4.318 0 8 0s6.667 1.194 6.667 2.667V4c0 1.473-2.985 2.667-6.667 2.667S1.333 5.473 1.333 4z"></path>
                                              <path d="M1.333 6.334v3C1.333 10.805 4.318 12 8 12s6.667-1.194 6.667-2.667V6.334a6.5 6.5 0 0 1-1.458.79C11.81 7.684 9.967 8 8 8s-3.809-.317-5.208-.876a6.5 6.5 0 0 1-1.458-.79z"></path>
                                              <path d="M14.667 11.668a6.5 6.5 0 0 1-1.458.789c-1.4.56-3.242.876-5.21.876-1.966 0-3.809-.316-5.208-.876a6.5 6.5 0 0 1-1.458-.79v1.666C1.333 14.806 4.318 16 8 16s6.667-1.194 6.667-2.667z"></path>
                                          </svg></div><small className="fw-medium text-muted">Resources</small>
                                  </div>
                                  <div className="text-body stat-value"><span>142</span></div>
                                  <div className="d-flex align-items-center gap-1 mt-2"><small className="fw-semibold text-success"><svg className="bi bi-arrow-up-short" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                                              <path fillRule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5"></path>
                                          </svg>+8 </small><small className="text-muted">across OCI</small></div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="card border shadow-sm mb-4">
                      <div className="card-body p-4">
                          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                              <div>
                                  <h6 className="text-body mb-1">Spend Overview</h6><small className="text-muted">OCI cloud spend · April 2026</small>
                              </div>
                              <div className="btn-group btn-group-sm" role="group" aria-label="Chart period"><input type="radio" defaultChecked="" className="btn-check" id="pMonth" name="period" /><label className="btn btn-outline-primary" htmlFor="pMonth">Monthly</label><input type="radio" className="btn-check" id="pWeek" name="period" /><label className="btn btn-outline-primary" htmlFor="pWeek">Weekly</label><input type="radio" className="btn-check" id="pDay" name="period" /><label className="btn btn-outline-primary" htmlFor="pDay">Daily</label></div>
                          </div>
                          <div className="bg-body-secondary rounded-2 d-flex align-items-end gap-3 p-3" style={{height: '160px'}}>
                              <div className="d-flex flex-column flex-grow-1 align-items-center gap-1">
                                  <div className="bg-primary bg-opacity-50 w-100 rounded-top" style={{height: '70%'}}></div><small className="text-muted" style={{fontSize: '10px'}}>Jan</small>
                              </div>
                              <div className="d-flex flex-column flex-grow-1 align-items-center gap-1">
                                  <div className="bg-primary bg-opacity-50 w-100 rounded-top" style={{height: '79%'}}></div><small className="text-muted" style={{fontSize: '10px'}}>Feb</small>
                              </div>
                              <div className="d-flex flex-column flex-grow-1 align-items-center gap-1">
                                  <div className="bg-primary bg-opacity-75 w-100 rounded-top" style={{height: '93%'}}></div><small className="text-muted" style={{fontSize: '10px'}}>Mar</small>
                              </div>
                              <div className="d-flex flex-column flex-grow-1 align-items-center gap-1">
                                  <div className="bg-primary w-100 rounded-top" style={{height: '83%'}}></div><small className="fw-bold text-primary" style={{fontSize: '10px'}}>Apr</small>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="row mb-4 g-4">
                      <div className="col-xl-6">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body p-4">
                                  <h6 className="fw-bold text-body mb-1">Top Services by Cost</h6><small className="text-muted d-block mb-4">April 2026 · OCI</small>
                                  <div className="d-flex flex-column gap-3">
                                      <div>
                                          <div className="d-flex justify-content-between mb-1"><small className="fw-medium text-body">Compute (VM.Standard)</small><small className="fw-semibold text-body">$9,840</small></div>
                                          <div className="progress rounded-pill progress-xs">
                                              <div className="progress-bar bg-primary" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" style={{width: '40%'}}><span className="visually-hidden">50%</span></div>
                                          </div><small className="text-muted" style={{fontSize: '10px'}}>39.6% of total</small>
                                      </div>
                                      <div>
                                          <div className="d-flex justify-content-between mb-1"><small className="fw-medium text-body">Block Storage</small><small className="fw-semibold text-body">$4,200</small></div>
                                          <div className="progress rounded-pill progress-xs">
                                              <div className="progress-bar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" style={{width: '17%', background: '#3B82F6'}}><span className="visually-hidden">50%</span></div>
                                          </div><small className="text-muted" style={{fontSize: '10px'}}>16.9% of total</small>
                                      </div>
                                      <div>
                                          <div className="d-flex justify-content-between mb-1"><small className="fw-medium text-body">Object Storage</small><small className="fw-semibold text-body">$3,600</small></div>
                                          <div className="progress rounded-pill progress-xs">
                                              <div className="progress-bar bg-warning" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" style={{width: '15%'}}><span className="visually-hidden">50%</span></div>
                                          </div><small className="text-muted" style={{fontSize: '10px'}}>14.5% of total</small>
                                      </div>
                                      <div>
                                          <div className="d-flex justify-content-between mb-1"><small className="fw-medium text-body">Load Balancer</small><small className="fw-semibold text-body">$2,800</small></div>
                                          <div className="progress rounded-pill progress-xs">
                                              <div className="progress-bar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" style={{width: '11%', background: 'var(--bs-pink)'}}><span className="visually-hidden">50%</span></div>
                                          </div><small className="text-muted" style={{fontSize: '10px'}}>11.3% of total</small>
                                      </div>
                                      <div>
                                          <div className="d-flex justify-content-between mb-1"><small className="fw-medium text-body">Database (MySQL)</small><small className="fw-semibold text-body">$2,400</small></div>
                                          <div className="progress rounded-pill progress-xs">
                                              <div className="progress-bar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" style={{width: '10%', background: '#8B5CF6'}}><span className="visually-hidden">50%</span></div>
                                          </div><small className="text-muted" style={{fontSize: '10px'}}>9.7% of total</small>
                                      </div>
                                      <div>
                                          <div className="d-flex justify-content-between mb-1"><small className="fw-medium text-body">Networking</small><small className="fw-semibold text-body">$2,000</small></div>
                                          <div className="progress rounded-pill progress-xs">
                                              <div className="progress-bar bg-success" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" style={{width: '8%'}}><span className="visually-hidden">50%</span></div>
                                          </div><small className="text-muted" style={{fontSize: '10px'}}>8.0% of total</small>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="col-xl-6">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body p-4">
                                  <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                                      <h6 className="fw-bold text-body mb-0">Savings Recommendations</h6><span className="badge text-success bg-success-subtle rounded-pill flex-shrink-0"> $4,620 total </span>
                                  </div><small className="text-muted d-block mb-4">Top opportunities found by AI</small>
                                  <div className="d-flex flex-column gap-3">
                                      <div className="card bg-body-secondary border rounded-2 p-3 border-s-primary">
                                          <div className="d-flex align-items-center flex-wrap gap-2 mb-1"><span className="fw-semibold text-body" style={{fontSize: '13px'}}>Rightsize analytics cluster</span><span className="badge fw-normal text-secondary-emphasis bg-secondary-subtle" style={{fontSize: '10px'}}>Compute</span></div>
                                          <p className="text-muted mb-2" style={{fontSize: '12px'}}>Scale from 12 → 6 nodes. 14-day avg CPU: 22%</p>
                                          <div className="d-flex align-items-center gap-3"><span className="fw-bold text-success" style={{fontSize: '13px'}}>$2,400/mo</span><small className="text-muted">Effort: Low</small></div>
                                      </div>
                                      <div className="card bg-body-secondary border rounded-2 p-3 border-s-success">
                                          <div className="d-flex align-items-center flex-wrap gap-2 mb-1"><span className="fw-semibold text-body" style={{fontSize: '13px'}}>Archive unused block volumes</span><span className="badge fw-normal text-secondary-emphasis bg-secondary-subtle" style={{fontSize: '10px'}}>Storage</span></div>
                                          <p className="text-muted mb-2" style={{fontSize: '12px'}}>5 volumes unattached for &gt;30 days</p>
                                          <div className="d-flex align-items-center gap-3"><span className="fw-bold text-success" style={{fontSize: '13px'}}>$680/mo</span><small className="text-muted">Effort: Low</small></div>
                                      </div>
                                      <div className="card bg-body-secondary border rounded-2 p-3 border-s-warning">
                                          <div className="d-flex align-items-center flex-wrap gap-2 mb-1"><span className="fw-semibold text-body" style={{fontSize: '13px'}}>Enable auto-scale-in cooldown</span><span className="badge fw-normal text-secondary-emphasis bg-secondary-subtle" style={{fontSize: '10px'}}>Config</span></div>
                                          <p className="text-muted mb-2" style={{fontSize: '12px'}}>Current cooldown: 2h. Recommended: 30min</p>
                                          <div className="d-flex align-items-center gap-3"><span className="fw-bold text-success" style={{fontSize: '13px'}}>$1,200/mo</span><small className="text-muted">Effort: Med</small></div>
                                      </div>
                                      <div className="card bg-body-secondary border rounded-2 p-3" style={{borderLeft: '3px solid #3B82F6'}}>
                                          <div className="d-flex align-items-center flex-wrap gap-2 mb-1"><span className="fw-semibold text-body" style={{fontSize: '13px'}}>Move cold objects to Archive tier</span><span className="badge fw-normal text-secondary-emphasis bg-secondary-subtle" style={{fontSize: '10px'}}>Storage</span></div>
                                          <p className="text-muted mb-2" style={{fontSize: '12px'}}>62% of Object Storage untouched &gt;90 days</p>
                                          <div className="d-flex align-items-center gap-3"><span className="fw-bold text-success" style={{fontSize: '13px'}}>$340/mo</span><small className="text-muted">Effort: Low</small></div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="row g-4">
                      <div className="col-xl-4">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body p-4">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                      <h6 className="fw-bold text-body mb-0">Anomalies</h6><span className="badge fw-semibold text-danger-emphasis bg-danger-subtle rounded-pill"> 3 active </span>
                                  </div><small className="text-muted d-block mb-4">Unusual spending patterns</small>
                                  <div className="d-flex flex-column gap-3">
                                      <div className="card border rounded-2 border-s-danger">
                                          <div className="card-body d-flex align-items-start gap-2 p-3"><span className="badge fw-bold text-danger-emphasis bg-danger-subtle flex-shrink-0 mt-1" style={{fontSize: '10px'}}>High</span>
                                              <div className="flex-grow-1">
                                                  <div className="fw-semibold text-body" style={{fontSize: '13px'}}><span>Unexpected compute spike</span></div><small className="text-muted">data-pipeline cluster grew 3× on Apr 14</small>
                                              </div><small className="text-nowrap text-muted ms-1">2d ago</small>
                                          </div>
                                      </div>
                                      <div className="card border rounded-2 border-s-warning">
                                          <div className="card-body d-flex align-items-start gap-2 p-3"><span className="badge fw-bold text-warning-emphasis bg-warning-subtle flex-shrink-0 mt-1" style={{fontSize: '10px'}}>Med</span>
                                              <div className="flex-grow-1">
                                                  <div className="fw-semibold text-body" style={{fontSize: '13px'}}><span>Egress cost up 34%</span></div><small className="text-muted">Networking costs trending above baseline</small>
                                              </div><small className="text-nowrap text-muted ms-1">5d ago</small>
                                          </div>
                                      </div>
                                      <div className="card border rounded-2 border-s-secondary">
                                          <div className="card-body d-flex align-items-start gap-2 p-3"><span className="badge fw-bold text-secondary-emphasis bg-secondary-subtle flex-shrink-0 mt-1" style={{fontSize: '10px'}}>Low</span>
                                              <div className="flex-grow-1">
                                                  <div className="fw-semibold text-body" style={{fontSize: '13px'}}><span>Idle DB instance detected</span></div><small className="text-muted">mysql-staging has 0 connections for 12 days</small>
                                              </div><small className="text-nowrap text-muted ms-1">1w ago</small>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="col-xl-8">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body p-4">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                      <h6 className="fw-bold text-body mb-0">Resource Inventory</h6><small className="text-muted">6 of 142 · OCI</small>
                                  </div><small className="text-muted d-block mb-4">Sorted by estimated monthly cost</small>
                                  <div>
                                      <table className="table table-hover align-middle mb-3">
                                          <thead>
                                              <tr>
                                                  <th className="text-uppercase fw-semibold text-muted" style={{fontSize: '10px', letterSpacing: '.5px', paddingBottom: '10px'}}>Resource</th>
                                                  <th className="text-uppercase fw-semibold text-muted" style={{fontSize: '10px', letterSpacing: '.5px', paddingBottom: '10px'}}>Type</th>
                                                  <th className="text-uppercase fw-semibold text-muted" style={{fontSize: '10px', letterSpacing: '.5px', paddingBottom: '10px'}}>Status</th>
                                                  <th className="text-uppercase fw-semibold text-end text-muted" style={{fontSize: '10px', letterSpacing: '.5px', paddingBottom: '10px'}}>Mo. Cost</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              <tr>
                                                  <td><span className="bg-danger rounded-circle d-inline-block me-1" style={{width: '6px', height: '6px', verticalAlign: 'middle'}}></span><span className="fw-medium text-body" style={{fontSize: '13px'}}>data-pipeline-prod</span></td>
                                                  <td><small className="text-muted">VM.Standard3.Flex</small></td>
                                                  <td><span className="badge fw-semibold text-success-emphasis bg-success-subtle rounded-pill" style={{fontSize: '11px'}}>running</span></td>
                                                  <td className="fw-semibold text-end text-body" style={{fontSize: '13px'}}>$1,820</td>
                                              </tr>
                                              <tr>
                                                  <td><span className="fw-medium text-body" style={{fontSize: '13px'}}>app-server-01</span></td>
                                                  <td><small className="text-muted">VM.Standard2.4</small></td>
                                                  <td><span className="badge fw-semibold text-success-emphasis bg-success-subtle rounded-pill" style={{fontSize: '11px'}}>running</span></td>
                                                  <td className="fw-semibold text-end text-body" style={{fontSize: '13px'}}>$640</td>
                                              </tr>
                                              <tr>
                                                  <td><span className="fw-medium text-body" style={{fontSize: '13px'}}>mysql-prod</span></td>
                                                  <td><small className="text-muted">MySQL.HeatWave.VM.Standard</small></td>
                                                  <td><span className="badge fw-semibold text-success-emphasis bg-success-subtle rounded-pill" style={{fontSize: '11px'}}>running</span></td>
                                                  <td className="fw-semibold text-end text-body" style={{fontSize: '13px'}}>$1,200</td>
                                              </tr>
                                              <tr>
                                                  <td><span className="bg-danger rounded-circle d-inline-block me-1" style={{width: '6px', height: '6px', verticalAlign: 'middle'}}></span><span className="fw-medium text-body" style={{fontSize: '13px'}}>mysql-staging</span></td>
                                                  <td><small className="text-muted">MySQL.VM.Standard.E3.1.8</small></td>
                                                  <td><span className="badge fw-semibold text-warning-emphasis bg-warning-subtle rounded-pill" style={{fontSize: '11px'}}>idle</span></td>
                                                  <td className="fw-semibold text-end text-body" style={{fontSize: '13px'}}>$240</td>
                                              </tr>
                                              <tr>
                                                  <td><span className="bg-danger rounded-circle d-inline-block me-1" style={{width: '6px', height: '6px', verticalAlign: 'middle'}}></span><span className="fw-medium text-body" style={{fontSize: '13px'}}>storage-backup-01</span></td>
                                                  <td><small className="text-muted">Block Volume 2TB</small></td>
                                                  <td><span className="badge fw-semibold text-danger-emphasis bg-danger-subtle rounded-pill" style={{fontSize: '11px'}}>unattached</span></td>
                                                  <td className="fw-semibold text-end text-body" style={{fontSize: '13px'}}>$200</td>
                                              </tr>
                                              <tr>
                                                  <td><span className="fw-medium text-body" style={{fontSize: '13px'}}>lb-production</span></td>
                                                  <td><small className="text-muted">Load Balancer 100Mbps</small></td>
                                                  <td><span className="badge fw-semibold text-success-emphasis bg-success-subtle rounded-pill" style={{fontSize: '11px'}}>running</span></td>
                                                  <td className="fw-semibold text-end text-body" style={{fontSize: '13px'}}>$560</td>
                                              </tr>
                                          </tbody>
                                      </table>
                                  </div><a className="btn btn-outline-primary btn-sm" role="button" href="/resources"> View all 142 resources <svg className="bi bi-arrow-right ms-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                                          <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"></path>
                                      </svg></a>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
    </CustomerShell>
  );
};

export default IndexPage;
