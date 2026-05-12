import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

// ── Types ─────────────────────────────────────────────────────────────────────

interface User {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type: string;
  active: boolean;
}

interface Company {
  company_id: string;
  name: string;
  active: boolean;
}

interface Connection {
  connection_id: string;
  company_id: string;
  tenancy: string;
  user: string;
  fingerprint: string;
}

interface AuthContextType {
  user:          User | null;
  companies:     Company[];
  activeCompany: Company | null;
  connection:    Connection | null;
  token:         string | null;
  isLoading:     boolean;
  switchCompany: (companyId: string) => Promise<void>;
  logout:        () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ── Helpers ───────────────────────────────────────────────────────────────────

const authFetch = async (path: string, token: string) => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
};

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,          setUser]          = useState<User | null>(null);
  const [companies,     setCompanies]     = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [connection,    setConnection]    = useState<Connection | null>(null);
  const [isLoading,     setIsLoading]     = useState(true);

  const token = localStorage.getItem('cloudey_access_token');

  // ── Load connection for a given company ────────────────────────
  const loadConnection = async (companyId: string) => {
    if (!token) return;
    try {
      const connections = await authFetch(
        `/api/identity/connections/?company_id=${companyId}`, token
      );
      setConnection(connections[0] ?? null);
    } catch {
      setConnection(null);
    }
  };

  // ── Switch active company ──────────────────────────────────────
  const switchCompany = async (companyId: string) => {
    const company = companies.find(c => c.company_id === companyId) ?? null;
    setActiveCompany(company);
    localStorage.setItem('cloudey_selected_company_id', companyId);
    if (company) await loadConnection(companyId);
  };

  // ── Bootstrap on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!token) { setIsLoading(false); return; }

    const bootstrap = async () => {
      try {
        // 1. Fetch current user
        const userData = await authFetch('/api/identity/users/me', token);
        setUser(userData);

        // 2. Fetch companies
        const companiesData = await authFetch('/api/identity/companies/', token);
        setCompanies(companiesData);

        // 3. Select company — restore last selection, else first (covers staff + multi-company)
        const savedId = localStorage.getItem('cloudey_selected_company_id');
        const saved =
          savedId != null && savedId !== ''
            ? companiesData.find((c: Company) => String(c.company_id) === savedId)
            : undefined;
        const company = saved ?? companiesData[0] ?? null;

        if (company) {
          setActiveCompany(company);
          localStorage.setItem('cloudey_selected_company_id', company.company_id);
          await loadConnection(company.company_id);
        }
      } catch (err) {
        console.error('Auth bootstrap failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  // ── Logout ─────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('cloudey_access_token');
    localStorage.removeItem('cloudey_selected_company_id');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user, companies, activeCompany, connection, token, isLoading, switchCompany, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
