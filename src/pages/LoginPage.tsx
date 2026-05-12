import React from 'react';
import { useLogin } from '../hooks/useLogin';

const LoginPage: React.FC = () => {
  const { email, setEmail, password, setPassword, handleLogin } = useLogin();
  return (
    <>
      <div id="loginPage">
      <div id="glow1"></div>
          <div id="glow2"></div>
          <div id="glow3"></div>
          <div className="card border rounded-4 shadow p-4 p-sm-5 mx-3" id="loginCard">
              <div className="text-center mb-4"><img src="/logo-cloudey.png" alt="Cloudey" style={{height: '52px', width: 'auto'}} /></div>
              <h1 className="fw-bold text-center text-body mb-1 h5" style={{letterSpacing: '-.5px'}}> Welcome back </h1>
              <p className="text-center text-muted mb-4" style={{fontSize: '14px'}}> Sign in to your Cloudey account </p>
              <div className="alert alert-danger d-flex align-items-center gap-2 mb-3 py-2 d-none" role="alert" id="loginError" style={{fontSize: '13px'}}><svg className="bi bi-exclamation-circle-fill flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4m.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2"></path>
                  </svg><span> Invalid email or password. Please try again. </span></div>
              <form id="loginForm" noValidate="" data-cloudey="auth.login" onSubmit={handleLogin}>
                  <div className="mb-3"><label className="form-label fw-semibold" htmlFor="email" style={{fontSize: '13px'}}>Email</label>
                      <div className="input-group"><span className="text-muted bg-body-secondary input-group-text border-end-0"><svg className="bi bi-envelope" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '13px'}}>
                                  <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"></path>
                              </svg></span><input className="bg-body-secondary form-control border-start-0" type="email" id="email" autoComplete="email" name="email" placeholder="alex@company.com" required="" style={{fontSize: '14px'}} data-cloudey="auth.email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                  </div>
                  <div className="mb-2"><label className="form-label fw-semibold" htmlFor="password" style={{fontSize: '13px'}}>Password</label>
                      <div className="input-group position-relative"><span className="text-muted bg-body-secondary input-group-text border-end-0"><svg className="bi bi-lock" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" style={{fontSize: '13px'}}>
                                  <path fillRule="evenodd" d="M8 0a4 4 0 0 1 4 4v2.05a2.5 2.5 0 0 1 2 2.45v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 13.5v-5a2.5 2.5 0 0 1 2-2.45V4a4 4 0 0 1 4-4M4.5 7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7zM8 1a3 3 0 0 0-3 3v2h6V4a3 3 0 0 0-3-3"></path>
                              </svg></span><input className="bg-body-secondary form-control pe-5 border-start-0 border-end-0" type="password" id="password" autoComplete="current-password" name="password" placeholder="••••••••" required="" style={{fontSize: '14px'}} data-cloudey="auth.password" value={password} onChange={e => setPassword(e.target.value)} /><button aria-label="Show password" id="pwToggle" type="button"><svg className="bi bi-eye" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" id="eyeIcon" style={{fontSize: '14px'}}>
                                  <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"></path>
                                  <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"></path>
                              </svg></button></div>
                  </div>
                  <div className="text-end mb-4"><a className="text-decoration-none" href="#" style={{fontSize: '12px', fontWeight: '500'}}> Forgot password? </a></div><button className="btn btn-primary fw-semibold w-100 mb-4" type="submit" id="loginBtn" style={{fontSize: '15px', padding: '12px'}}> Sign in <svg className="bi bi-arrow-right ms-1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"></path>
                      </svg></button>
              </form>
          </div>
    
    
      </div>
    </>
  );
};

export default LoginPage;
