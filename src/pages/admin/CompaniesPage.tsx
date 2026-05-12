import React from 'react';
import AdminShell from '../../layout/AdminShell';
import { useAdminCompanies } from '../../hooks/useAdminCompanies';

const CompaniesPage: React.FC = () => {
  const { companyRows, loading, createName, setCreateName, createPlan, setCreatePlan, creating, editName, setEditName, editPlan, setEditPlan, saving, handleCreateSubmit, handleEditSubmit, openCreateModal, openEditCompany, toggleCompanyActive, planBadgeClass, statusBadgeClass } = useAdminCompanies();
  return (
    <AdminShell>
      <div className="container-fluid" style={{maxWidth: '1200px', padding: '32px 32px 80px'}}>
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                      <div>
                          <h1 className="fw-bold text-body mb-1 h4">Companies</h1><small className="text-muted">5 workspaces</small>
                      </div><button className="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#modalNewCompany" data-cloudey="admin.companies.open_create_btn" type="button" onClick={openCreateModal}><svg className="bi bi-plus-lg me-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                              <path fillRule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"></path>
                          </svg>New Company </button>
                  </div>
                  <div className="d-flex align-items-center flex-wrap gap-3 mb-4">
                      <div className="input-group" style={{maxWidth: '300px'}}><span className="text-muted bg-body-secondary input-group-text border-end-0"><svg className="bi bi-search" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '12px'}}>
                                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"></path>
                              </svg></span><input className="bg-body-secondary form-control border-start-0" type="text" placeholder="Search companies..." style={{fontSize: '13px'}} /></div>
                      <ul className="nav nav-pills gap-1 mb-0" role="tablist">
                          <li className="nav-item"></li>
                          <li className="nav-item"></li>
                          <li className="nav-item"></li>
                          <li className="nav-item"></li>
                      </ul>
                  </div>
                  <div className="card border shadow-sm">
                      <div className="p-0 card-body">
                          <table className="table table-hover align-middle mb-0">
                              <thead>
                                  <tr>
                                      <th className="text-uppercase fw-semibold text-muted px-4" style={{fontSize: '10px', letterSpacing: '.5px', paddingBlock: '12px'}}>Company</th>
                                      <th className="text-uppercase fw-semibold text-muted" style={{fontSize: '10px', letterSpacing: '.5px'}}>Plan</th>
                                      <th className="text-uppercase fw-semibold text-muted" style={{fontSize: '10px', letterSpacing: '.5px'}}>Users</th>
                                      <th className="text-uppercase fw-semibold text-muted" style={{fontSize: '10px', letterSpacing: '.5px'}}>MRR</th>
                                      <th className="text-uppercase fw-semibold text-muted" style={{fontSize: '10px', letterSpacing: '.5px'}}>Status</th>
                                      <th></th>
                                  </tr>
                              </thead>
                              <tbody>
        {companyRows.map((company) => (
          <tr key={String(company.company_id)}>
                                      <td className="text-body px-4" style={{fontSize: '13px'}}>{company.name}</td>
                                      <td><span className="badge fw-semibold rounded-pill" style={{fontSize: '11px'}} className={planBadgeClass(company.plan_type)} style={{fontSize: '11px'}}>{company.plan_type}</span></td>
                                      <td className="text-body" style={{fontSize: '13px'}}>{company.users_count}</td>
                                      <td><span className="fw-bold text-success" style={{fontSize: '13px'}}>$299</span></td>
                                      <td><span className="badge fw-semibold rounded-pill" style={{fontSize: '11px'}} className={statusBadgeClass(company.active)} style={{fontSize: '11px'}}>{company.active ? 'Active' : 'Suspended'}</span></td>
                                      <td className="pe-3">
                                          <div className="btn-group d-flex gap-1 btn-group" role="group"><button className="btn btn-outline-primary btn-sm" type="button" data-bs-target="#modalEditCompany" data-bs-toggle="modal" onClick={() => openEditCompany(company)}>Edit</button><button className="btn btn-outline-warning btn-sm py-1" type="button" onClick={() => toggleCompanyActive(company)}>{company.active ? 'Suspend' : 'Activate'}</button></div>
                                      </td>
                                  </tr>
        ))}
      </tbody>
                          </table>
                      </div>
                  </div>
                  <div className="modal fade" role="dialog" tabIndex="-1" id="modalNewCompany">
                      <div className="modal-dialog modal-dialog-centered" role="document">
                          <div className="modal-content rounded-3">
                              <div className="modal-header border-bottom">
                                  <h6 className="modal-title fw-bold">Create Company</h6><button className="btn-close" data-bs-dismiss="modal" type="button"></button>
                              </div>
                              <form data-cloudey="admin.companies.create_form" onSubmit={handleCreateSubmit}>
                                  <div className="modal-body">
                                      <div className="mb-3"><label className="form-label fw-semibold" style={{fontSize: '13px'}}>Company Name <span className="text-danger">*</span></label><input className="bg-light border form-control form-control-sm d-block w-100" type="text" placeholder="Acme Corp" data-cloudey="admin.companies.create.name" value={createName} onChange={e => setCreateName(e.target.value)} /></div>
                                      <div className="mb-3"><label className="form-label fw-semibold" style={{fontSize: '13px'}}>Plan</label><select className="bg-light border form-select form-select-sm d-block w-100" data-cloudey="admin.companies.create.plan" value={createPlan} onChange={e => setCreatePlan(e.target.value)}>
                                              <option value="Free Trial">Free Trial</option>
                                              <option value="Starter">Starter</option>
                                              <option value="Pro">Pro</option>
                                              <option value="Enterprise">Enterprise</option>
                                          </select></div>
                                      <div className="mb-3"></div>
                                  </div>
                                  <div className="modal-footer border-top"><button className="btn btn-outline-primary btn-sm" type="submit"><svg className="bi bi-check-lg me-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                                              <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"></path>
                                          </svg>Create Company</button><button className="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cancel</button></div>
                              </form>
                          </div>
                      </div>
                  </div>
                  <div className="modal fade" role="dialog" tabIndex="-1" id="modalEditCompany">
                      <div className="modal-dialog modal-dialog-centered" role="document">
                          <div className="modal-content rounded-3">
                              <div className="modal-header border-bottom">
                                  <h6 className="modal-title fw-bold">Edit Company</h6><button className="btn-close" data-bs-dismiss="modal" type="button"></button>
                              </div>
                              <form data-cloudey="admin.companies.edit_form" onSubmit={handleEditSubmit}>
                                  <div className="modal-body">
                                      <div className="mb-3"><label className="form-label fw-semibold" style={{fontSize: '13px'}}>Company Name</label><input className="bg-light border form-control form-control-sm d-block w-100" type="text" placeholder="Acme Corp" data-cloudey="admin.companies.edit.name" value={editName} onChange={e => setEditName(e.target.value)} /></div>
                                      <div className="mb-3"><label className="form-label fw-semibold" style={{fontSize: '13px'}}>Plan</label><select className="bg-light border form-select form-select-sm d-block w-100 form-control-sm" placeholder="acme.com" data-cloudey="admin.companies.edit.plan" value={editPlan} onChange={e => setEditPlan(e.target.value)} defaultValue="Pro">
                                              <option value="Free Trial">Free Trial</option>
                                              <option value="Starter">Starter</option>
                                              <option value="Pro">Pro</option>
                                              <option value="Enterprise">Enterprise</option>
                                          </select></div>
                                  </div>
                                  <div className="modal-footer border-top">
                                      <div className="d-flex gap-2"><button className="btn btn-outline-primary btn-sm" type="submit">Save</button><button className="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cancel</button></div>
                                  </div>
                              </form>
                          </div>
                      </div>
                  </div>
              </div>
    </AdminShell>
  );
};

export default CompaniesPage;
