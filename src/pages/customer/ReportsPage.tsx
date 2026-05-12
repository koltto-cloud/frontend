import React from 'react';
import CustomerShell from '../../layout/CustomerShell';

const ReportsPage: React.FC = () => {
  return (
    <CustomerShell>
      <div className="container-fluid" style={{maxWidth: '1200px', padding: '32px 32px 80px'}}>
                  <div className="mb-4">
                      <h1 className="fw-bold text-body mb-1 h4">Reports</h1><small className="text-muted">Generate and download cloud cost reports · OCI</small>
                  </div>
                  <div className="row mb-4 g-3">
                      <div className="col-md-6 col-xl-3">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body"><small className="fw-medium text-muted d-block mb-3">Reports Generated</small>
                                  <div className="text-body stat-value"><span>12</span></div><small className="text-muted">This month</small>
                              </div>
                          </div>
                      </div>
                      <div className="col-md-6 col-xl-3">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body"><small className="fw-medium text-muted d-block mb-3">Scheduled Reports</small>
                                  <div className="text-primary stat-value"><span>3</span></div><small className="text-muted">Weekly + monthly</small>
                              </div>
                          </div>
                      </div>
                      <div className="col-md-6 col-xl-3">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body"><small className="fw-medium text-muted d-block mb-3">Data Coverage</small>
                                  <div className="text-success stat-value" style={{fontSize: '22px'}}><span>Apr 2026</span></div><small className="text-muted">Latest period</small>
                              </div>
                          </div>
                      </div>
                      <div className="col-md-6 col-xl-3">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body"><small className="fw-medium text-muted d-block mb-3">Export Formats</small>
                                  <div className="text-body stat-value" style={{fontSize: '22px'}}><span>PDF · CSV</span></div><small className="text-muted">Available</small>
                              </div>
                          </div>
                      </div>
                  </div>
                  <h6 className="fw-bold text-body mb-1">Report Templates</h6><small className="text-muted d-block mb-3">Generate a report instantly from your live OCI data</small>
                  <div className="row mb-4 g-3">
                      <div className="col-md-6">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body d-flex gap-3 p-4">
                                  <div className="bg-primary bg-opacity-10 rounded-2 d-flex flex-shrink-0 justify-content-center align-items-center" style={{width: '44px', height: '44px'}}><svg className="bi bi-bar-chart-line-fill text-primary" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '16px'}}>
                                          <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1z"></path>
                                      </svg></div>
                                  <div className="flex-grow-1">
                                      <div className="fw-bold text-body mb-1"><span>Cost Summary</span></div>
                                      <p className="text-muted mb-3" style={{fontSize: '13px', lineHeight: '1.6'}}>Monthly spend breakdown by service, region, and resource with month-over-month comparison and trend analysis.</p>
                                      <div className="d-flex justify-content-between align-items-center"><small className="text-muted">Est. ~30 sec</small><button className="btn btn-primary btn-sm"><svg className="bi bi-download me-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                                                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"></path>
                                                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"></path>
                                              </svg>Generate</button></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="col-md-6">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body d-flex gap-3 p-4">
                                  <div className="bg-success bg-opacity-10 rounded-2 d-flex flex-shrink-0 justify-content-center align-items-center" style={{width: '44px', height: '44px'}}><svg className="bi bi-piggy-bank-fill text-success" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '16px'}}>
                                          <path d="M7.964 1.527c-2.977 0-5.571 1.704-6.32 4.125h-.55A1 1 0 0 0 .11 6.824l.254 1.46a1.5 1.5 0 0 0 1.478 1.243h.263c.3.513.688.978 1.145 1.382l-.729 2.477a.5.5 0 0 0 .48.641h2a.5.5 0 0 0 .471-.332l.482-1.351c.635.173 1.31.267 2.011.267.707 0 1.388-.095 2.028-.272l.543 1.372a.5.5 0 0 0 .465.316h2a.5.5 0 0 0 .478-.645l-.761-2.506C13.81 9.895 14.5 8.559 14.5 7.069q0-.218-.02-.431c.261-.11.508-.266.705-.444.315.306.815.306.815-.417 0 .223-.5.223-.461-.026a1 1 0 0 0 .09-.255.7.7 0 0 0-.202-.645.58.58 0 0 0-.707-.098.74.74 0 0 0-.375.562c-.024.243.082.48.32.654a2 2 0 0 1-.259.153c-.534-2.664-3.284-4.595-6.442-4.595m7.173 3.876a.6.6 0 0 1-.098.21l-.044-.025c-.146-.09-.157-.175-.152-.223a.24.24 0 0 1 .117-.173c.049-.027.08-.021.113.012a.2.2 0 0 1 .064.199m-8.999-.65a.5.5 0 1 1-.276-.96A7.6 7.6 0 0 1 7.964 3.5c.763 0 1.497.11 2.18.315a.5.5 0 1 1-.287.958A6.6 6.6 0 0 0 7.964 4.5c-.64 0-1.255.09-1.826.254ZM5 6.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0"></path>
                                      </svg></div>
                                  <div className="flex-grow-1">
                                      <div className="fw-bold text-body mb-1"><span>Savings Report</span></div>
                                      <p className="text-muted mb-3" style={{fontSize: '13px', lineHeight: '1.6'}}>All identified optimization opportunities with estimated impact, effort level, and implementation status.</p>
                                      <div className="d-flex justify-content-between align-items-center"><small className="text-muted">Est. ~20 sec</small><button className="btn btn-success btn-sm"><svg className="bi bi-download me-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                                                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"></path>
                                                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"></path>
                                              </svg>Generate</button></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="col-md-6">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body d-flex gap-3 p-4">
                                  <div className="bg-danger bg-opacity-10 rounded-2 d-flex flex-shrink-0 justify-content-center align-items-center" style={{width: '44px', height: '44px'}}><svg className="bi bi-exclamation-triangle-fill text-danger" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '16px'}}>
                                          <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"></path>
                                      </svg></div>
                                  <div className="flex-grow-1">
                                      <div className="fw-bold text-body mb-1"><span>Anomaly Report</span></div>
                                      <p className="text-muted mb-3" style={{fontSize: '13px', lineHeight: '1.6'}}>Timeline of detected anomalies, resolution status, and recommendations to prevent recurrence.</p>
                                      <div className="d-flex justify-content-between align-items-center"><small className="text-muted">Est. ~15 sec</small><button className="btn btn-danger btn-sm"><svg className="bi bi-download me-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                                                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"></path>
                                                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"></path>
                                              </svg>Generate</button></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="col-md-6">
                          <div className="card border shadow-sm h-100">
                              <div className="card-body d-flex gap-3 p-4">
                                  <div className="rounded-2 d-flex flex-shrink-0 justify-content-center align-items-center" style={{width: '44px', height: '44px', background: 'rgba(139,92,246,.1)'}}><svg className="bi bi-server" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '16px', color: '#8B5CF6'}}>
                                          <path d="M1.333 2.667C1.333 1.194 4.318 0 8 0s6.667 1.194 6.667 2.667V4c0 1.473-2.985 2.667-6.667 2.667S1.333 5.473 1.333 4z"></path>
                                          <path d="M1.333 6.334v3C1.333 10.805 4.318 12 8 12s6.667-1.194 6.667-2.667V6.334a6.5 6.5 0 0 1-1.458.79C11.81 7.684 9.967 8 8 8s-3.809-.317-5.208-.876a6.5 6.5 0 0 1-1.458-.79z"></path>
                                          <path d="M14.667 11.668a6.5 6.5 0 0 1-1.458.789c-1.4.56-3.242.876-5.21.876-1.966 0-3.809-.316-5.208-.876a6.5 6.5 0 0 1-1.458-.79v1.666C1.333 14.806 4.318 16 8 16s6.667-1.194 6.667-2.667z"></path>
                                      </svg></div>
                                  <div className="flex-grow-1">
                                      <div className="fw-bold text-body mb-1"><span>Resource Audit</span></div>
                                      <p className="text-muted mb-3" style={{fontSize: '13px', lineHeight: '1.6'}}>Full OCI inventory with utilization metrics, cost efficiency scores, and rightsizing flags per resource.</p>
                                      <div className="d-flex justify-content-between align-items-center"><small className="text-muted">Est. ~45 sec</small><button className="btn btn-sm" style={{background: 'rgba(139,92,246,.15)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,.3)'}}><svg className="bi bi-download me-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                                                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"></path>
                                                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"></path>
                                              </svg>Generate </button></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="card border shadow-sm">
                      <div className="card-body p-4">
                          <h6 className="fw-bold text-body mb-1">Recent Reports</h6><small className="text-muted d-block mb-4">Download previously generated reports</small>
                          <div>
                              <table className="table table-hover align-middle">
                                  <thead>
                                      <tr>
                                          <th className="text-uppercase fw-semibold text-muted" style={{fontSize: '10px', letterSpacing: '.5px'}}>Report Name</th>
                                          <th className="text-uppercase fw-semibold text-muted" style={{fontSize: '10px', letterSpacing: '.5px'}}>Generated</th>
                                          <th className="text-uppercase fw-semibold text-muted" style={{fontSize: '10px', letterSpacing: '.5px'}}>Size</th>
                                          <th className="text-uppercase fw-semibold text-muted" style={{fontSize: '10px', letterSpacing: '.5px'}}>Format</th>
                                          <th className="text-uppercase fw-semibold text-muted" style={{fontSize: '10px', letterSpacing: '.5px'}}>By</th>
                                          <th></th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      <tr>
                                          <td className="fw-medium text-body" style={{fontSize: '13px'}}>Cost Summary — March 2026</td>
                                          <td><small className="text-muted">Apr 1, 2026</small></td>
                                          <td><small className="text-muted">2.4 MB</small></td>
                                          <td><span className="badge fw-semibold text-primary-emphasis bg-primary-subtle rounded-pill" style={{fontSize: '10px'}}>PDF</span></td>
                                          <td><small className="text-muted">Alex M.</small></td>
                                          <td><button className="btn btn-outline-secondary btn-sm"><svg className="bi bi-download me-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '10px'}}>
                                                      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"></path>
                                                      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"></path>
                                                  </svg>Download</button></td>
                                      </tr>
                                      <tr>
                                          <td className="fw-medium text-body" style={{fontSize: '13px'}}>Savings Report — Q1 2026</td>
                                          <td><small className="text-muted">Mar 31, 2026</small></td>
                                          <td><small className="text-muted">1.8 MB</small></td>
                                          <td><span className="badge fw-semibold text-primary-emphasis bg-primary-subtle rounded-pill" style={{fontSize: '10px'}}>PDF</span></td>
                                          <td><small className="text-muted">Alex M.</small></td>
                                          <td><button className="btn btn-outline-secondary btn-sm"><svg className="bi bi-download me-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '10px'}}>
                                                      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"></path>
                                                      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"></path>
                                                  </svg>Download</button></td>
                                      </tr>
                                      <tr>
                                          <td className="fw-medium text-body" style={{fontSize: '13px'}}>Resource Audit — March 2026</td>
                                          <td><small className="text-muted">Mar 28, 2026</small></td>
                                          <td><small className="text-muted">4.1 MB</small></td>
                                          <td><span className="badge fw-semibold text-success-emphasis bg-success-subtle rounded-pill" style={{fontSize: '10px'}}>CSV</span></td>
                                          <td><small className="text-muted">Jordan L.</small></td>
                                          <td><button className="btn btn-outline-secondary btn-sm"><svg className="bi bi-download me-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '10px'}}>
                                                      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"></path>
                                                      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"></path>
                                                  </svg>Download</button></td>
                                      </tr>
                                      <tr>
                                          <td className="fw-medium text-body" style={{fontSize: '13px'}}>Anomaly Report — March 2026</td>
                                          <td><small className="text-muted">Mar 15, 2026</small></td>
                                          <td><small className="text-muted">980 KB</small></td>
                                          <td><span className="badge fw-semibold text-primary-emphasis bg-primary-subtle rounded-pill" style={{fontSize: '10px'}}>PDF</span></td>
                                          <td><small className="text-muted">Alex M.</small></td>
                                          <td><button className="btn btn-outline-secondary btn-sm"><svg className="bi bi-download me-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '10px'}}>
                                                      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"></path>
                                                      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"></path>
                                                  </svg>Download</button></td>
                                      </tr>
                                      <tr>
                                          <td className="fw-medium text-body" style={{fontSize: '13px'}}>Cost Summary — February 2026</td>
                                          <td><small className="text-muted">Mar 1, 2026</small></td>
                                          <td><small className="text-muted">2.1 MB</small></td>
                                          <td><span className="badge fw-semibold text-primary-emphasis bg-primary-subtle rounded-pill" style={{fontSize: '10px'}}>PDF</span></td>
                                          <td><small className="text-muted">Sam R.</small></td>
                                          <td><button className="btn btn-outline-secondary btn-sm"><svg className="bi bi-download me-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '10px'}}>
                                                      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"></path>
                                                      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"></path>
                                                  </svg>Download</button></td>
                                      </tr>
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              </div>
    </CustomerShell>
  );
};

export default ReportsPage;
